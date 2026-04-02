import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { sendPasswordResetOtpEmail } from '../../../lib/brevo';
import { generateOTP } from '../../../lib/tokens';
import { errorResponse, jsonResponse } from '../../../lib/utils';
import { checkForgotPasswordLimit, getClientIp } from '../../../lib/rateLimiter';
import { logAction } from '../../../lib/audit';

const schema = z.object({
  email: z.string().email(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const ip = getClientIp(request);

    const limit = checkForgotPasswordLimit(ip);
    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(limit.retryAfter ?? 900),
          },
        }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid email address', 400);
    }

    const { email } = parsed.data;

    // Always return success to prevent user enumeration
    const user = await db.user.findUnique({ where: { email } });

    if (user && user.emailVerified) {
      const otp = generateOTP();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.user.update({
        where: { id: user.id },
        data: { resetToken: otp, resetTokenExpires: expires },
      });

      let name = email;
      if (user.role === 'ADMIN') {
        const p = await db.adminProfile.findUnique({ where: { userId: user.id } });
        name = p?.name || email;
      } else if (user.role === 'CUSTOMER') {
        const p = await db.customerProfile.findUnique({ where: { userId: user.id } });
        name = p?.name || email;
      } else if (user.role === 'TAILOR') {
        const p = await db.tailorProfile.findUnique({ where: { userId: user.id } });
        name = p?.name || email;
      }

      await sendPasswordResetOtpEmail(email, name, otp);
      await logAction(user.id, 'PASSWORD_RESET_REQUESTED', 'USER', user.id, { ip }, request);
    }

    return jsonResponse({
      message: 'If an account with that email exists, a 6-digit OTP has been sent.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return errorResponse('Internal server error', 500);
  }
};
