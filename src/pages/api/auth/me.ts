import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const user = await db.user.findUnique({ where: { id: locals.user.id } });
    if (!user) return errorResponse('User not found', 404);

    let profile: any = null;
    if (user.role === 'CUSTOMER') {
      profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'TAILOR') {
      profile = await db.tailorProfile.findUnique({ where: { userId: user.id } });
    } else if (user.role === 'ADMIN') {
      profile = await db.adminProfile.findUnique({ where: { userId: user.id } });
    }

    return jsonResponse({
      id: user.id,
      email: user.email,
      role: user.role,
      name: profile?.name || '',
      phone: profile?.phone || '',
      profile,
    });
  } catch (err) {
    return errorResponse('Internal server error', 500);
  }
};
