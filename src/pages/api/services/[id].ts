import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  basePrice: z.number().positive().optional(),
  estimatedDays: z.number().int().optional(),
  complexity: z.enum(['SIMPLE', 'MEDIUM', 'COMPLEX']).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const GET: APIRoute = async ({ params }) => {
  try {
    const s = await db.service.findUnique({ where: { id: params.id } });
    if (!s) return errorResponse('Not found', 404);
    return jsonResponse(s);
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
    const s = await db.service.update({ where: { id: params.id }, data: parsed.data });
    return jsonResponse(s);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    await db.service.delete({ where: { id: params.id } });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
