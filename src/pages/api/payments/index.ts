import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse, formatCurrency } from '../../../lib/utils';
import { logAction } from '../../../lib/audit';
import { sendSystemNotification } from '../../../lib/notifications';

const paymentSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive(),
  method: z.enum(['CASH', 'CARD', 'UPI', 'ONLINE']).default('CASH'),
  type: z.enum(['ADVANCE', 'BALANCE']).default('ADVANCE'),
  notes: z.string().optional(),
});

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  try {
    const orderId = url.searchParams.get('orderId');
    const where: any = {};
    if (orderId) where.orderId = orderId;

    if (locals.user.role === 'CUSTOMER') {
      const profile = await db.customerProfile.findUnique({ where: { userId: locals.user.id } });
      if (!profile) return errorResponse('Profile not found', 404);
      where.order = { customerId: profile.id };
    }

    const payments = await db.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      include: { order: { select: { orderNumber: true } } },
    });

    return jsonResponse(payments);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  if (locals.user.role === 'CUSTOMER') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    const order = await db.order.findUnique({
      where: { id: parsed.data.orderId },
      include: { customer: true, tailor: true },
    });

    if (!order) return errorResponse('Order not found', 404);

    const payment = await db.payment.create({ data: parsed.data });

    // Update tailor earnings if order is assigned to a tailor
    if (order.tailorId && order.tailor) {
      await db.tailorProfile.update({
        where: { id: order.tailorId },
        data: { totalEarnings: { increment: parsed.data.amount } },
      });
    }

    // Award loyalty points to customer (1 point per ₹100 paid)
    const pointsEarned = Math.floor(parsed.data.amount / 100);
    if (pointsEarned > 0) {
      await db.customerProfile.update({
        where: { id: order.customerId },
        data: { loyaltyPoints: { increment: pointsEarned } },
      });
    }

    await logAction(locals.user.id, 'PAYMENT_RECEIVE', 'PAYMENT', payment.id, parsed.data, request);

    await sendSystemNotification(
      order.customer.userId,
      'Payment Received',
      `A payment of ${formatCurrency(parsed.data.amount)} has been recorded for your order #${order.orderNumber}.${pointsEarned > 0 ? ` You earned ${pointsEarned} loyalty points!` : ''}`,
      'success'
    );

    return jsonResponse(payment, 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};
