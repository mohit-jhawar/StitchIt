import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const serviceSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  basePrice: z.number().positive(),
  estimatedDays: z.number().int().min(1).default(7),
  complexity: z.enum(['SIMPLE', 'MEDIUM', 'COMPLEX']).default('MEDIUM'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const GET: APIRoute = async ({ url }) => {
  try {
    const active = url.searchParams.get('active');
    const where: any = {};
    if (active === 'true') where.isActive = true;

    const services = await db.service.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return jsonResponse(services);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = serviceSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    const service = await db.service.create({ data: parsed.data });
    return jsonResponse(service, 201);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
