import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { sendSystemNotification } from '../../../lib/notifications';
import { logAction } from '../../../lib/audit';

const adjustSchema = z.object({
  customerId: z.string(),     // CustomerProfile id
  points: z.number().int(),   // positive = add, negative = subtract
  reason: z.string().min(1),
});

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    const { customerId, points, reason } = parsed.data;

    const customer = await db.customerProfile.findUnique({
      where: { id: customerId },
      include: { user: { select: { id: true } } },
    });
    if (!customer) return errorResponse('Customer not found', 404);

    if (points < 0 && customer.loyaltyPoints + points < 0) {
      return errorResponse(`Cannot deduct ${Math.abs(points)} points — customer only has ${customer.loyaltyPoints}`, 400);
    }

    const updated = await db.customerProfile.update({
      where: { id: customerId },
      data: { loyaltyPoints: { increment: points } },
    });

    await logAction(locals.user.id, 'LOYALTY_ADJUST', 'USER', customerId, { points, reason }, request);

    await sendSystemNotification(
      customer.user.id,
      points > 0 ? 'Loyalty Points Added' : 'Loyalty Points Adjusted',
      points > 0
        ? `${points} loyalty points have been added to your account. Reason: ${reason}`
        : `${Math.abs(points)} loyalty points have been deducted from your account. Reason: ${reason}`,
      points > 0 ? 'success' : 'info'
    );

    return jsonResponse({ loyaltyPoints: updated.loyaltyPoints });
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};
