import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const updateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  specialization: z.string().optional(),
  experience: z.number().optional(),
});

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    const user = await db.user.findUnique({
      where: { id: params.id },
      include: {
        customerProfile: true,
        tailorProfile: true,
        adminProfile: true,
      },
    });
    if (!user) return errorResponse('Not found', 404);
    const { passwordHash, ...safe } = user;
    return jsonResponse(safe);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  // Allow admins to update any user, or users to update their own profile
  const isSelf = locals.user.id === params.id;
  if (!isSelf && locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400);

    const user = await db.user.findUnique({ where: { id: params.id } });
    if (!user) return errorResponse('Not found', 404);

    if (user.role === 'CUSTOMER' && parsed.data.name) {
      await db.customerProfile.update({
        where: { userId: params.id },
        data: { name: parsed.data.name, phone: parsed.data.phone, address: parsed.data.address },
      });
    } else if (user.role === 'TAILOR' && parsed.data.name) {
      await db.tailorProfile.update({
        where: { userId: params.id },
        data: { name: parsed.data.name, phone: parsed.data.phone, specialization: parsed.data.specialization, experience: parsed.data.experience },
      });
    }

    return jsonResponse({ success: true });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    await db.user.delete({ where: { id: params.id } });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
