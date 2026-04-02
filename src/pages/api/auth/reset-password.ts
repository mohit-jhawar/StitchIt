import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { hashPassword } from '../../../lib/auth';
import { errorResponse, jsonResponse } from '../../../lib/utils';
import { logAction } from '../../../lib/audit';

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long'),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || 'Invalid request';
      return errorResponse(message, 400);
    }

    const { token, password } = parsed.data;

    const user = await db.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return errorResponse('This reset link is invalid or has expired.', 400);
    }

    const passwordHash = await hashPassword(password);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
        passwordChangedAt: new Date(),
      },
    });

    await logAction(user.id, 'PASSWORD_RESET_SUCCESS', 'USER', user.id, undefined, request);

    return jsonResponse({ message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return errorResponse('Internal server error', 500);
  }
};
