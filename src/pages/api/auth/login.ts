import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { comparePassword, signToken } from '../../../lib/auth';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { logAction } from '../../../lib/audit';
import {
  checkLoginIpLimit,
  checkEmailLockout,
  recordLoginFailure,
  recordLoginSuccess,
  getClientIp,
} from '../../../lib/rateLimiter';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const ip = getClientIp(request);

    // Layer 1: IP sliding window — 10 attempts per minute
    const ipCheck = checkLoginIpLimit(ip);
    if (!ipCheck.allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(ipCheck.retryAfter ?? 60),
        },
      });
    }

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid email or password format', 400);
    }

    const { email, password } = parsed.data;

    // Layer 2: Per-email lockout — 5 failures → 15 min lock
    const lockCheck = checkEmailLockout(email);
    if (!lockCheck.allowed) {
      const minutes = Math.ceil((lockCheck.retryAfter ?? 900) / 60);
      await logAction(undefined, 'LOGIN_BLOCKED', 'USER', undefined, { email, reason: 'brute_force_lockout', ip }, request);
      return new Response(
        JSON.stringify({ error: `Account temporarily locked due to too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.` }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(lockCheck.retryAfter ?? 900),
          },
        }
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      // Still record a failure keyed to the email to discourage enumeration via timing
      recordLoginFailure(email);
      await logAction(undefined, 'LOGIN_FAILED', 'USER', undefined, { email, reason: 'user_not_found', ip }, request);
      return errorResponse('Invalid email or password', 401);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      recordLoginFailure(email);
      await logAction(user.id, 'LOGIN_FAILED', 'USER', user.id, { email, reason: 'invalid_password', ip }, request);
      return errorResponse('Invalid email or password', 401);
    }

    // Check email verification
    if (!user.emailVerified) {
      await logAction(user.id, 'LOGIN_BLOCKED', 'USER', user.id, { email, reason: 'email_unverified', ip }, request);
      return errorResponse('Your email address is not verified. Please check your inbox or spam for the verification link.', 403);
    }

    // Successful login — clear failure counter
    recordLoginSuccess(email);

    let name = '';
    if (user.role === 'ADMIN') {
      const profile = await db.adminProfile.findUnique({ where: { userId: user.id } });
      name = profile?.name || '';
    } else if (user.role === 'CUSTOMER') {
      const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
      name = profile?.name || '';
    } else if (user.role === 'TAILOR') {
      const profile = await db.tailorProfile.findUnique({ where: { userId: user.id } });
      name = profile?.name || '';
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role as any, name });

    await logAction(user.id, 'LOGIN_SUCCESS', 'USER', user.id, undefined, request);

    // Use Astro's cookie API for reliable cookie setting with @astrojs/node
    cookies.set('auth_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return jsonResponse({ success: true, user: { id: user.id, email: user.email, role: user.role, name } });
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse('Internal server error', 500);
  }
};
