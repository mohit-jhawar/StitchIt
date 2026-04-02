import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../../lib/db';
import { jsonResponse, errorResponse } from '../../../../lib/utils';
import { logAction } from '../../../../lib/audit';
import { sendSystemNotification } from '../../../../lib/notifications';

const assignSchema = z.object({
  tailorId: z.string(),
});

export const PATCH: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  if (locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) return errorResponse('tailorId required', 400);

    const oldOrder = await db.order.findUnique({ where: { id: params.id } });
    if (!oldOrder) return errorResponse('Order not found', 404);

    const order = await db.order.update({
      where: { id: params.id },
      data: { tailorId: parsed.data.tailorId },
      include: { tailor: true },
    });

    await logAction(locals.user.id, 'ORDER_ASSIGN', 'ORDER', order.id, { tailorId: parsed.data.tailorId }, request);

    if (order.tailor) {
      await sendSystemNotification(
        order.tailor.userId,
        'New Assignment',
        `You have been assigned to order #${order.orderNumber}.`,
        'success'
      );
    }

    return jsonResponse(order);
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};
