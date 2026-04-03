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
  pointsToRedeem: z.number().int().min(0).optional().default(0),
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

    const { orderId, amount, method, type, notes, pointsToRedeem } = parsed.data;

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { customer: { include: { user: { select: { id: true } } } }, tailor: true },
    });

    if (!order) return errorResponse('Order not found', 404);

    // --- Validate payment doesn't exceed remaining balance ---
    const paidAggregate = await db.payment.aggregate({
      where: { orderId },
      _sum: { amount: true },
    });
    const alreadyPaid = paidAggregate._sum.amount ?? 0;
    const remaining = Math.max(0, order.totalAmount - alreadyPaid);

    // Calculate what this entire request will charge (cash + any loyalty discount)
    const POINTS_PER_RUPEE_CHECK = 100;
    const RUPEES_PER_100_POINTS_CHECK = 10;
    const loyaltyDiscount = pointsToRedeem > 0
      ? (pointsToRedeem / POINTS_PER_RUPEE_CHECK) * RUPEES_PER_100_POINTS_CHECK
      : 0;
    const totalThisRequest = amount + loyaltyDiscount;

    if (totalThisRequest > remaining + 0.01) {
      return errorResponse(
        `Payment of ₹${totalThisRequest.toFixed(2)} exceeds remaining balance of ₹${remaining.toFixed(2)}`,
        400
      );
    }

    // --- Loyalty redemption validation ---
    const POINTS_PER_RUPEE = 100; // 100 points = ₹10 → 10 points = ₹1
    const RUPEES_PER_100_POINTS = 10;

    let loyaltyPayment = null;
    if (pointsToRedeem && pointsToRedeem > 0) {
      if (pointsToRedeem % 100 !== 0) return errorResponse('Points must be redeemed in multiples of 100', 400);
      const customer = await db.customerProfile.findUnique({ where: { id: order.customerId } });
      if (!customer) return errorResponse('Customer profile not found', 404);
      if (customer.loyaltyPoints < pointsToRedeem) {
        return errorResponse(`Customer only has ${customer.loyaltyPoints} loyalty points available`, 400);
      }
      const discountAmount = (pointsToRedeem / POINTS_PER_RUPEE) * RUPEES_PER_100_POINTS;

      // Create the loyalty discount payment entry
      loyaltyPayment = await db.payment.create({
        data: {
          orderId,
          amount: discountAmount,
          method: 'POINTS',
          type: 'LOYALTY',
          notes: `${pointsToRedeem} loyalty points redeemed (₹${discountAmount} discount)`,
          pointsRedeemed: pointsToRedeem,
        },
      });

      // Deduct points from customer
      await db.customerProfile.update({
        where: { id: order.customerId },
        data: { loyaltyPoints: { decrement: pointsToRedeem } },
      });
    }

    // Record the cash payment
    const payment = await db.payment.create({
      data: { orderId, amount, method, type, notes },
    });

    // Update tailor earnings
    if (order.tailorId && order.tailor) {
      await db.tailorProfile.update({
        where: { id: order.tailorId },
        data: { totalEarnings: { increment: amount } },
      });
    }

    // Award loyalty points (1 point per ₹100 cash paid — not on loyalty discount itself)
    const pointsEarned = Math.floor(amount / 100);
    if (pointsEarned > 0) {
      await db.customerProfile.update({
        where: { id: order.customerId },
        data: { loyaltyPoints: { increment: pointsEarned } },
      });
    }

    await logAction(locals.user.id, 'PAYMENT_RECEIVE', 'PAYMENT', payment.id, parsed.data, request);

    const discountNote = loyaltyPayment
      ? ` ${pointsToRedeem} loyalty points were redeemed for a ₹${(pointsToRedeem! / POINTS_PER_RUPEE) * RUPEES_PER_100_POINTS} discount.`
      : '';
    const earnNote = pointsEarned > 0 ? ` You earned ${pointsEarned} loyalty points!` : '';

    await sendSystemNotification(
      order.customer.user.id,
      'Payment Received',
      `A payment of ${formatCurrency(amount)} has been recorded for your order #${order.orderNumber}.${discountNote}${earnNote}`,
      'success'
    );

    return jsonResponse({ payment, loyaltyPayment }, 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};
