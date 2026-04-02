import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  chest: z.number().optional(),
  waist: z.number().optional(),
  hip: z.number().optional(),
  shoulder: z.number().optional(),
  sleeve: z.number().optional(),
  length: z.number().optional(),
  inseam: z.number().optional(),
  neck: z.number().optional(),
  notes: z.string().optional(),
});

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    const m = await db.measurement.findUnique({ where: { id: params.id } });
    if (!m) return errorResponse('Not found', 404);
    return jsonResponse(m);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400);
    const m = await db.measurement.update({ where: { id: params.id }, data: parsed.data });
    return jsonResponse(m);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    await db.measurement.delete({ where: { id: params.id } });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
