import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const fabricSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  pricePerMeter: z.number().positive(),
  stockQuantity: z.number().min(0).default(0),
  lowStockAlert: z.number().min(0).default(5),
  color: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const GET: APIRoute = async ({ url }) => {
  try {
    const active = url.searchParams.get('active');
    const where: any = {};
    if (active === 'true') where.isActive = true;

    const fabrics = await db.fabric.findMany({ where, orderBy: { name: 'asc' } });
    return jsonResponse(fabrics);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    const body = await request.json();
    const parsed = fabricSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);
    const fabric = await db.fabric.create({ data: parsed.data });
    return jsonResponse(fabric, 201);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
