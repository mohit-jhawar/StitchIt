import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { generateResetToken } from '../../../lib/tokens';
import { errorResponse, jsonResponse } from '../../../lib/utils';
import { logAction } from '../../../lib/audit';
import { checkOtpVerifyLimit, getClientIp } from '../../../lib/rateLimiter';

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const ip = getClientIp(request);
    const limit = checkOtpVerifyLimit(ip);
    if (!limit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please wait before trying again.' }),
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
      return errorResponse('Invalid request', 400);
    }

    const { email, otp } = parsed.data;

    const user = await db.user.findUnique({ where: { email } });

    if (
      !user ||
      user.resetToken !== otp ||
      !user.resetTokenExpires ||
      user.resetTokenExpires < new Date()
    ) {
      return errorResponse('Invalid or expired OTP.', 400);
    }

    // OTP is valid — exchange it for a secure reset token (1 hour)
    const { token, expires } = generateResetToken();

    await db.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: expires },
    });

    await logAction(user.id, 'PASSWORD_RESET_OTP_VERIFIED', 'USER', user.id, undefined, request);

    return jsonResponse({ resetToken: token });
  } catch (err) {
    console.error('Verify reset OTP error:', err);
    return errorResponse('Internal server error', 500);
  }
};
