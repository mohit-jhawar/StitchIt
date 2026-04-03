import type { APIRoute } from 'astro';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import db from '../../../lib/db';
import { generateOrderNumber, paginate, jsonResponse, errorResponse } from '../../../lib/utils';
import { logAction } from '../../../lib/audit';
import { sendSystemNotification } from '../../../lib/notifications';

const createOrderSchema = z.object({
  measurementId: z.string().optional(),
  customerId:    z.string().optional(),
  designId:      z.string().optional(),
  priority:      z.enum(['NORMAL', 'URGENT', 'EXPRESS']).default('NORMAL'),
  notes:         z.string().optional(),
  deliveryDate:  z.string().optional(),
  couponCode:    z.string().optional(),
  items: z.array(z.object({
    serviceId: z.string(),
    fabricId:  z.string().optional(),
    quantity:  z.number().int().min(1).default(1),
    unitPrice: z.number().positive(),
    notes:     z.string().optional(),
  })).min(1),
});

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  const page   = parseInt(url.searchParams.get('page')  || '1');
  const limit  = parseInt(url.searchParams.get('limit') || '10');
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

  if (status) where.status = status as Prisma.EnumOrderStatusFilter;
  if (search) {
    where.OR = [
      { orderNumber: { contains: search } },
      { notes:       { contains: search } },
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
          tailor:   { select: { name: true } },
          items:    { include: { service: true, fabric: true } },
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

    const { measurementId, priority, notes, deliveryDate, items, designId, couponCode } = parsed.data;

    // --- Resolve customer identity ---
    let customerId:     string;
    let customerUserId: string;
    let savedByName:    string;
    const savedByRole = role;

    if (role === 'CUSTOMER') {
      const profile = await db.customerProfile.findUnique({ where: { userId } });
      if (!profile) return errorResponse('Customer profile not found', 404);
      customerId     = profile.id;
      customerUserId = userId;
      savedByName    = profile.name + ' (You)';
    } else {
      const profileId = parsed.data.customerId;
      if (!profileId) return errorResponse('customerId required', 400);
      const profile = await db.customerProfile.findUnique({ where: { id: profileId }, include: { user: true } });
      if (!profile) return errorResponse('Customer profile not found', 404);
      customerId     = profileId;
      customerUserId = profile.userId;

      if (role === 'TAILOR') {
        const tailor = await db.tailorProfile.findUnique({ where: { userId } });
        savedByName  = tailor ? `${tailor.name} (Tailor)` : 'Tailor';
      } else {
        savedByName = 'Admin';
      }
    }

    // --- Fix #4: For CUSTOMER orders, fetch authoritative prices from DB ---
    // Staff (TAILOR/ADMIN) may set custom prices; customers may not.
    let resolvedItems = items;

    if (role === 'CUSTOMER') {
      const serviceIds = items.map((i) => i.serviceId);
      const services   = await db.service.findMany({
        where: { id: { in: serviceIds }, isActive: true },
        select: { id: true, basePrice: true },
      });
      const serviceMap = new Map(services.map((s) => [s.id, s]));

      // Reject if any service doesn't exist or is inactive
      for (const item of items) {
        if (!serviceMap.has(item.serviceId)) {
          return errorResponse(`Service not found or inactive: ${item.serviceId}`, 400);
        }
      }

      // Override client-provided unitPrice with the service's actual basePrice
      resolvedItems = items.map((item) => ({
        ...item,
        unitPrice: serviceMap.get(item.serviceId)!.basePrice,
      }));
    }

    // --- Calculate gross total from resolved items ---
    const grossTotal = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    // --- Fix #1: Validate coupon server-side and compute discount ---
    let couponDiscount = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const coupon = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });

      if (!coupon)                   return errorResponse('Invalid coupon code', 400);
      if (!coupon.isActive)          return errorResponse('Coupon is inactive', 400);
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return errorResponse('Coupon has expired', 400);
      }
      if (coupon.usedCount >= coupon.maxUsage) {
        return errorResponse('Coupon usage limit reached', 400);
      }
      if (coupon.minOrderAmount && grossTotal < coupon.minOrderAmount) {
        return errorResponse(`Minimum order amount for this coupon is ₹${coupon.minOrderAmount}`, 400);
      }

      couponDiscount = coupon.discountType === 'PERCENTAGE'
        ? (grossTotal * coupon.value) / 100
        : Math.min(coupon.value, grossTotal); // flat discount cannot exceed order total

      appliedCouponCode = coupon.code;
    }

    const totalAmount = Math.max(0, grossTotal - couponDiscount);
    const orderNumber = generateOrderNumber();

    // --- Create order + increment coupon usedCount atomically ---
    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          measurementId:  measurementId || undefined,
          designId:       designId      || undefined,
          priority,
          notes,
          deliveryDate:   deliveryDate ? new Date(deliveryDate) : undefined,
          totalAmount,
          couponCode:     appliedCouponCode,
          couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
          savedById:      userId,
          savedByName,
          savedByRole,
          items: {
            create: resolvedItems.map((item) => ({
              serviceId: item.serviceId,
              fabricId:  item.fabricId || undefined,
              quantity:  item.quantity,
              unitPrice: item.unitPrice,
              notes:     item.notes,
            })),
          },
          timeline: {
            create: {
              status:    'PENDING',
              note:      `Order recorded by ${savedByName}`,
              updatedBy: userId,
            },
          },
        },
        include: {
          items:    { include: { service: true, fabric: true } },
          customer: true,
        },
      });

      // Increment coupon usedCount only after order is successfully created
      if (appliedCouponCode) {
        await tx.coupon.update({
          where: { code: appliedCouponCode },
          data:  { usedCount: { increment: 1 } },
        });
      }

      return created;
    });

    await logAction(locals.user.id, 'ORDER_CREATE', 'ORDER', order.id, { orderNumber }, request);

    await sendSystemNotification(
      customerUserId,
      'Order Received',
      `Your order #${orderNumber} has been received and is currently pending confirmation.${couponDiscount > 0 ? ` Coupon discount of ₹${couponDiscount.toFixed(2)} applied.` : ''}`,
      'success'
    );

    return jsonResponse(order, 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};
