import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const couponSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FLAT']).default('PERCENTAGE'),
  value: z.number().positive(),
  minOrderAmount: z.number().optional(),
  maxUsage: z.number().int().default(100),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    const coupons = await db.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return jsonResponse(coupons);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    const body = await request.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    const coupon = await db.coupon.create({
      data: {
        ...parsed.data,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      },
    });
    return jsonResponse(coupon, 201);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
