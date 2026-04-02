import type { APIRoute } from 'astro';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import db from '../../../lib/db';
import { generateOrderNumber, paginate, jsonResponse, errorResponse } from '../../../lib/utils';
import { logAction } from '../../../lib/audit';
import { sendSystemNotification } from '../../../lib/notifications';

const createOrderSchema = z.object({
  measurementId: z.string().optional(),
  customerId: z.string().optional(),
  designId: z.string().optional(),
  priority: z.enum(['NORMAL', 'URGENT', 'EXPRESS']).default('NORMAL'),
  notes: z.string().optional(),
  deliveryDate: z.string().optional(),
  items: z.array(z.object({
    serviceId: z.string(),
    fabricId: z.string().optional(),
    quantity: z.number().int().min(1).default(1),
    unitPrice: z.number().positive(),
    notes: z.string().optional(),
  })).min(1),
});

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || '';

  const { skip, take } = paginate(page, limit);

  const where: Prisma.OrderWhereInput = {};

  if (locals.user.role === 'CUSTOMER') {
    const profile = await db.customerProfile.findUnique({ where: { userId: locals.user.id } });
    if (!profile) return errorResponse('Profile not found', 404);
    where.customerId = profile.id;
  } else if (locals.user.role === 'TAILOR') {
    const profile = await db.tailorProfile.findUnique({ where: { userId: locals.user.id } });
    if (!profile) return errorResponse('Profile not found', 404);
    where.tailorId = profile.id;
  }

  if (status) where.status = status as any;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { notes: { contains: search } },
    ];
  }

  try {
    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          tailor: { select: { name: true } },
          items: { include: { service: true, fabric: true } },
          payments: true,
        },
      }),
      db.order.count({ where }),
    ]);

    return jsonResponse({ orders, total, page, limit, totalPages: Math.ceil(total / take) });
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  const { role, id: userId } = locals.user;
  if (role !== 'CUSTOMER' && role !== 'ADMIN' && role !== 'TAILOR') {
    return errorResponse('Forbidden', 403);
  }

  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);
    }

    const { measurementId, priority, notes, deliveryDate, items, designId } = parsed.data;

    let customerId: string;
    let customerUserId: string;
    let savedByName: string;
    let savedByRole = role;

    if (role === 'CUSTOMER') {
      const profile = await db.customerProfile.findUnique({ where: { userId } });
      if (!profile) return errorResponse('Customer profile not found', 404);
      customerId = profile.id;
      customerUserId = userId;
      savedByName = profile.name + ' (You)';
    } else {
      const profileId = parsed.data.customerId;
      if (!profileId) return errorResponse('customerId required', 400);
      const profile = await db.customerProfile.findUnique({ where: { id: profileId }, include: { user: true } });
      if (!profile) return errorResponse('Customer profile not found', 404);
      customerId = profileId;
      customerUserId = profile.userId;
      
      if (role === 'TAILOR') {
        const tailor = await db.tailorProfile.findUnique({ where: { userId } });
        savedByName = tailor ? `${tailor.name} (Tailor)` : 'Tailor';
      } else {
        savedByName = 'Admin';
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const orderNumber = generateOrderNumber();

    const order = await db.order.create({
      data: {
        orderNumber,
        customerId,
        measurementId: measurementId || undefined,
        designId: designId || undefined,
        priority,
        notes,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        totalAmount,
        savedById: userId,
        savedByName,
        savedByRole,
        items: {
          create: items.map((item) => ({
            serviceId: item.serviceId,
            fabricId: item.fabricId || undefined,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes,
          })),
        },
        timeline: {
          create: {
            status: 'PENDING',
            note: `Order recorded by ${savedByName}`,
            updatedBy: userId,
          },
        },
      },
      include: {
        items: { include: { service: true, fabric: true } },
        customer: true,
      },
    });

    await logAction(locals.user.id, 'ORDER_CREATE', 'ORDER', order.id, { orderNumber }, request);
    
    await sendSystemNotification(
      customerUserId,
      'Order Received',
      `Your order #${orderNumber} has been received and is currently pending confirmation.`,
      'success'
    );

    return jsonResponse(order, 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};
