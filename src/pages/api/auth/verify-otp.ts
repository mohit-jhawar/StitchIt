import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { logAction } from '../../../lib/audit';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return errorResponse('Email and OTP are required', 400);
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    if (user.emailVerified) {
      return errorResponse('Account already verified', 400);
    }

    // Check if OTP matches
    if (user.verificationToken !== otp) {
      return errorResponse('Invalid verification code', 400);
    }

    // Check if OTP is expired
    const now = new Date();
    if (user.verificationExpires && user.verificationExpires < now) {
      return errorResponse('This verification code has expired. Please register again.', 401);
    }

    // Success: Verify email and clear OTP data
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
      },
    });

    await logAction(user.id, 'VERIFY_SUCCESS', 'USER', user.id, { email }, request);

    return jsonResponse({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return errorResponse('Internal server error', 500);
  }
};
