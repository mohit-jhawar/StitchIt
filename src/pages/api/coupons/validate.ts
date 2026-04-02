import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const validateSchema = z.object({
  code: z.string(),
  orderAmount: z.number().positive(),
});

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  try {
    const body = await request.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400);

    const { code, orderAmount } = parsed.data;

    const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon) return errorResponse('Invalid coupon code', 404);
    if (!coupon.isActive) return errorResponse('Coupon is inactive', 400);
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return errorResponse('Coupon has expired', 400);
    }
    if (coupon.usedCount >= coupon.maxUsage) {
      return errorResponse('Coupon usage limit reached', 400);
    }
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return errorResponse(`Minimum order amount is ₹${coupon.minOrderAmount}`, 400);
    }

    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = (orderAmount * coupon.value) / 100;
    } else {
      discount = coupon.value;
    }

    return jsonResponse({
      valid: true,
      coupon,
      discount,
      finalAmount: orderAmount - discount,
    });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
