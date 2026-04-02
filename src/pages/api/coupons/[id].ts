import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const updateSchema = z.object({
  value: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().optional(),
  maxUsage: z.number().int().optional(),
});

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    const c = await db.coupon.findUnique({ where: { id: params.id } });
    if (!c) return errorResponse('Not found', 404);
    return jsonResponse(c);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400);
    const c = await db.coupon.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      },
    });
    return jsonResponse(c);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    await db.coupon.delete({ where: { id: params.id } });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
