import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { sendSystemNotification } from '../../../lib/notifications';

const reviewSchema = z.object({
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export const GET: APIRoute = async ({ url }) => {
  try {
    const orderId = url.searchParams.get('orderId');
    const where: any = {};
    if (orderId) where.orderId = orderId;

    const reviews = await db.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } } },
    });
    return jsonResponse(reviews);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  if (locals.user.role !== 'CUSTOMER') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    const profile = await db.customerProfile.findUnique({ where: { userId: locals.user.id } });
    if (!profile) return errorResponse('Profile not found', 404);

    const review = await db.review.create({
      data: { ...parsed.data, customerId: profile.id },
    });

    // Notify tailor if order was assigned to one
    const order = await db.order.findUnique({
      where: { id: parsed.data.orderId },
      include: { tailor: { select: { userId: true } } },
    });
    if (order?.tailor?.userId) {
      const stars = '★'.repeat(parsed.data.rating) + '☆'.repeat(5 - parsed.data.rating);
      await sendSystemNotification(
        order.tailor.userId,
        'New Review Received',
        `You received a ${stars} review from a customer.${parsed.data.comment ? ` "${parsed.data.comment}"` : ''}`,
        parsed.data.rating >= 4 ? 'success' : 'info'
      );
    }

    return jsonResponse(review, 201);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
