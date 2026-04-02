import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { generateVerificationToken } from '../../../lib/tokens';
import { sendVerificationEmail } from '../../../lib/brevo';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { checkResendVerificationLimit, getClientIp } from '../../../lib/rateLimiter';

export const POST: APIRoute = async ({ request }) => {
  const ip = getClientIp(request);
  const limit = checkResendVerificationLimit(ip);
  if (!limit.allowed) {
    return errorResponse(`Too many requests. Please wait ${limit.retryAfter}s before trying again.`, 429);
  }

  try {
    const { email } = await request.json();
    if (!email) return errorResponse('Email is required', 400);

    const user = await db.user.findUnique({
      where: { email },
      include: {
        customerProfile: { select: { name: true } },
        tailorProfile: { select: { name: true } },
        adminProfile: { select: { name: true } },
      }
    });

    if (!user) {
      // Security: return success even if user not found to prevent email enumeration
      return jsonResponse({ success: true, message: 'If this email is registered, a verification link has been sent.' });
    }

    if (user.emailVerified) {
      return errorResponse('Email is already verified', 400);
    }

    // Generate new token
    const token = generateVerificationToken();
    await db.user.update({
      where: { id: user.id },
      data: { verificationToken: token }
    });

    const name = user.customerProfile?.name || user.tailorProfile?.name || user.adminProfile?.name || 'User';

    // Resend email
    await sendVerificationEmail(user.email, name, token, user.role);

    return jsonResponse({ success: true, message: 'Verification link resent successfully.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    return errorResponse('Internal server error', 500);
  }
};
