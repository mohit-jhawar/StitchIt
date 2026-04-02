import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../../lib/db';
import { jsonResponse, errorResponse } from '../../../../lib/utils';
import { logAction } from '../../../../lib/audit';
import { sendSystemNotification } from '../../../../lib/notifications';

const statusSchema = z.object({
  status: z.enum(['PENDING','CONFIRMED','FABRIC_SELECTED','CUTTING','STITCHING','FITTING','ALTERATIONS','QUALITY_CHECK','READY','DELIVERED']),
  note: z.string().optional(),
});

export const PATCH: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  if (locals.user.role === 'CUSTOMER') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Invalid status', 400);

    const oldOrder = await db.order.findUnique({
      where: { id: params.id },
      include: { customer: true }
    });
    if (!oldOrder) return errorResponse('Order not found', 404);

    const order = await db.order.update({
      where: { id: params.id },
      data: {
        status: parsed.data.status,
        timeline: {
          create: {
            status: parsed.data.status,
            note: parsed.data.note,
            updatedBy: locals.user.id,
          },
        },
      },
      include: { timeline: { orderBy: { createdAt: 'asc' } } },
    });

    await logAction(locals.user.id, 'ORDER_STATUS_UPDATE', 'ORDER', order.id, { from: oldOrder.status, to: parsed.data.status, note: parsed.data.note }, request);

    await sendSystemNotification(
      oldOrder.customer.userId,
      'Order Status Updated',
      `Your order #${oldOrder.orderNumber} status changed to ${parsed.data.status}`,
      'info'
    );

    return jsonResponse(order);
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};
