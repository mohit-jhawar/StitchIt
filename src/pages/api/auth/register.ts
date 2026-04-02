import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { hashPassword } from '../../../lib/auth';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { logAction } from '../../../lib/audit';
import { getClientIp, checkRegisterIpLimit } from '../../../lib/rateLimiter';
import { generateVerificationToken } from '../../../lib/tokens';
import { sendVerificationEmail } from '../../../lib/brevo';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  role: z.enum(['CUSTOMER', 'TAILOR', 'ADMIN']).default('CUSTOMER'),
  phone: z
    .string()
    .regex(/^[+]?[\d\s\-()\u0966-\u096F]{7,15}$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const ip = getClientIp(request);
    const ipCheck = checkRegisterIpLimit(ip);
    if (!ipCheck.allowed) {
      return new Response(JSON.stringify({ error: 'Too many attempts. Please wait.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(ipCheck.retryAfter ?? 600),
        },
      });
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);
    }

    const { email, password, name, role, phone } = parsed.data;

    // Check for existing user
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      // Logic for re-registering if previous attempt expired or was unverified
      const now = new Date();
      const isExpired = existing.verificationExpires && existing.verificationExpires < now;

      if (!existing.emailVerified && isExpired) {
        // Safe to delete and recreate because verification window closed
        await db.user.delete({ where: { id: existing.id } });
      } else if (!existing.emailVerified && !isExpired) {
        return errorResponse('An account with this email is awaiting verification. Please check your inbox.', 409);
      } else {
        return errorResponse('Email already registered', 409);
      }
    }

    const isAdmin = role === 'ADMIN';
    const passwordHash = await hashPassword(password);
    const otp = isAdmin ? null : generateVerificationToken();
    const expires = isAdmin ? null : new Date(Date.now() + 10 * 60 * 1000);

    const user = await db.user.create({
      data: { 
        email, 
        passwordHash, 
        role,
        emailVerified: isAdmin, // Admins verified by default
        verificationToken: otp,
        verificationExpires: expires,
      },
    });

    const profileData = { 
      userId: user.id, 
      name, 
      phone: (phone && phone.trim()) || null 
    };

    if (role === 'CUSTOMER') {
      await db.customerProfile.create({ data: profileData });
    } else if (role === 'TAILOR') {
      await db.tailorProfile.create({ data: profileData });
    } else if (role === 'ADMIN') {
      await db.adminProfile.create({ data: { userId: user.id, name } });
    }

    // Only send OTP email if not an admin
    if (!isAdmin && otp) {
      await sendVerificationEmail(email, name, otp, role);
    }

    await logAction(user.id, 'REGISTER_SUCCESS', 'USER', user.id, { role, email, otpSent: !isAdmin }, request);

    return jsonResponse(
      { 
        success: true, 
        message: isAdmin 
          ? 'Admin account created successfully!' 
          : 'Account created! Please enter the 6-digit OTP sent to your email to verify.',
        user: { id: user.id, email: user.email, role: user.role, name },
        redirectTo: isAdmin ? '/login' : '/verify-otp'
      },
      201
    );
  } catch (err: any) {
    console.error('Register error:', err);
    return errorResponse(`Internal server error: ${err?.message || 'Unknown error'}`, 500);
  }
};
