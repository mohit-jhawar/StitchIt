import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { logAction } from '../../../lib/audit';
import { sendSystemNotification } from '../../../lib/notifications';

const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'FABRIC_SELECTED', 'CUTTING', 'STITCHING', 'FITTING', 'ALTERATIONS', 'QUALITY_CHECK', 'READY', 'DELIVERED']).optional(),
  priority: z.enum(['NORMAL', 'URGENT', 'EXPRESS']).optional(),
  notes: z.string().optional(),
  deliveryDate: z.string().optional(),
  tailorId: z.string().optional(),
}).partial();

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  try {
    const order = await db.order.findUnique({
      where: { id: params.id },
      include: {
        customer: { include: { user: { select: { email: true } } } },
        tailor: { include: { user: { select: { email: true } } } },
        measurement: true,
        items: { include: { service: true, fabric: true } },
        payments: true,
        timeline: { orderBy: { createdAt: 'asc' } },
        reviews: true,
        complaints: true,
      },
    });

    if (!order) return errorResponse('Order not found', 404);

    if (locals.user.role === 'CUSTOMER') {
      const profile = await db.customerProfile.findUnique({ where: { userId: locals.user.id } });
      if (order.customerId !== profile?.id) return errorResponse('Forbidden', 403);
    } else if (locals.user.role === 'TAILOR') {
      const profile = await db.tailorProfile.findUnique({ where: { userId: locals.user.id } });
      if (order.tailorId !== profile?.id) return errorResponse('Forbidden', 403);
    }

    return jsonResponse(order);
  } catch (err) {
    return errorResponse('Internal server error', 500);
  }
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  if (locals.user.role === 'CUSTOMER') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400);

    const oldOrder = await db.order.findUnique({
      where: { id: params.id },
      include: { customer: true }
    });
    if (!oldOrder) return errorResponse('Order not found', 404);

    const data: any = { ...parsed.data };
    if (data.deliveryDate) data.deliveryDate = new Date(data.deliveryDate);

    const order = await db.order.update({
      where: { id: params.id },
      data,
    });

    // Create timeline entry if status changed
    if (parsed.data.status && parsed.data.status !== oldOrder.status) {
      await db.orderTimeline.create({
        data: {
          orderId: order.id,
          status: parsed.data.status as any,
          note: `Status updated to ${parsed.data.status}`,
          updatedBy: locals.user.id,
        },
      });

      await sendSystemNotification(
        oldOrder.customer.userId,
        'Order Update',
        `Your order #${order.orderNumber} status has been updated to ${order.status}.`,
        'info'
      );
    }

    // Notify if tailor is assigned
    if (parsed.data.tailorId && parsed.data.tailorId !== oldOrder.tailorId) {
      const tailor = await db.tailorProfile.findUnique({ where: { id: parsed.data.tailorId } });
      if (tailor) {
        await sendSystemNotification(
          tailor.userId,
          'New Assignment',
          `You have been assigned to order #${order.orderNumber}.`,
          'success'
        );
      }
    }

    await logAction(locals.user.id, 'ORDER_UPDATE', 'ORDER', order.id, parsed.data, request);

    return jsonResponse(order);
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  if (locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    await db.order.delete({ where: { id: params.id } });
    await logAction(locals.user.id, 'ORDER_DELETE', 'ORDER', params.id, undefined);
    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse('Internal server error', 500);
  }
};
