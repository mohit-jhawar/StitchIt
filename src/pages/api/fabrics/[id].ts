import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const updateSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  pricePerMeter: z.number().positive().optional(),
  stockQuantity: z.number().min(0).optional(),
  lowStockAlert: z.number().min(0).optional(),
  color: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const GET: APIRoute = async ({ params }) => {
  try {
    const f = await db.fabric.findUnique({ where: { id: params.id } });
    if (!f) return errorResponse('Not found', 404);
    return jsonResponse(f);
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
    const f = await db.fabric.update({ where: { id: params.id }, data: parsed.data });
    return jsonResponse(f);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    await db.fabric.delete({ where: { id: params.id } });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
