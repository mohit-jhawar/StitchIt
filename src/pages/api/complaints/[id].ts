import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const updateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  resolution: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    const c = await db.complaint.findUnique({
      where: { id: params.id },
      include: { customer: true, order: true },
    });
    if (!c) return errorResponse('Not found', 404);
    return jsonResponse(c);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user || locals.user.role === 'CUSTOMER') return errorResponse('Forbidden', 403);
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400);
    const c = await db.complaint.update({ where: { id: params.id }, data: parsed.data });
    return jsonResponse(c);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
