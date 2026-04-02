import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  category: z.string().min(1).optional(),
  serviceId: z.string().optional(),
  images: z.array(z.string()).min(1).max(5).optional(),
  tags: z.string().optional().nullable(),
  basePrice: z.number().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

function parseImages(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const design = await db.design.findUnique({
      where: { id: params.id },
      include: { service: { select: { id: true, name: true, basePrice: true, category: true } } },
    });
    if (!design) return errorResponse('Design not found', 404);
    return jsonResponse({ ...design, images: parseImages(design.images) });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const PUT: APIRoute = async ({ locals, request, params }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    const existing = await db.design.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse('Design not found', 404);

    if (parsed.data.serviceId) {
      const service = await db.service.findUnique({ where: { id: parsed.data.serviceId } });
      if (!service) return errorResponse('Service not found', 404);
    }

    const { images, ...rest } = parsed.data;
    const design = await db.design.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(images ? { images: JSON.stringify(images) } : {}),
      },
      include: { service: { select: { id: true, name: true, basePrice: true } } },
    });

    return jsonResponse({ ...design, images: parseImages(design.images) });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    const existing = await db.design.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse('Design not found', 404);

    // Soft delete — keep record for existing orders that reference it
    await db.design.update({ where: { id: params.id }, data: { isActive: false } });
    return jsonResponse({ message: 'Design deactivated' });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
