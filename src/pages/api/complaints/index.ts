import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const complaintSchema = z.object({
  orderId: z.string().optional(),
  subject: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  try {
    let where: any = {};
    if (locals.user.role === 'CUSTOMER') {
      const profile = await db.customerProfile.findUnique({ where: { userId: locals.user.id } });
      if (!profile) return errorResponse('Profile not found', 404);
      where.customerId = profile.id;
    }

    const complaints = await db.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        order: { select: { orderNumber: true } },
      },
    });
    return jsonResponse(complaints);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'CUSTOMER') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = complaintSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    const profile = await db.customerProfile.findUnique({ where: { userId: locals.user.id } });
    if (!profile) return errorResponse('Profile not found', 404);

    const complaint = await db.complaint.create({
      data: { ...parsed.data, customerId: profile.id },
    });
    return jsonResponse(complaint, 201);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
