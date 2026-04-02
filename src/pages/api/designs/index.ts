import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse, paginate } from '../../../lib/utils';

const designSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  serviceId: z.string().min(1, 'Service is required'),
  images: z.array(z.string().url()).min(1, 'At least one image is required').max(5),
  tags: z.string().optional(),
  basePrice: z.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const GET: APIRoute = async ({ url }) => {
  try {
    const category = url.searchParams.get('category') || '';
    const active = url.searchParams.get('active');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '12');
    const { skip, take } = paginate(page, limit);

    const where: any = {};
    if (category) where.category = category;
    if (active === 'true') where.isActive = true;

    const [designs, total] = await Promise.all([
      db.design.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { service: { select: { id: true, name: true, basePrice: true, category: true } } },
      }),
      db.design.count({ where }),
    ]);

    // Parse images JSON for each design
    const parsed = designs.map((d) => ({
      ...d,
      images: (() => { try { return JSON.parse(d.images); } catch { return []; } })(),
    }));

    return jsonResponse({ designs: parsed, total, page, limit, totalPages: Math.ceil(total / take) });
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = designSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    const { images, ...rest } = parsed.data;

    // Verify service exists
    const service = await db.service.findUnique({ where: { id: rest.serviceId } });
    if (!service) return errorResponse('Service not found', 404);

    const design = await db.design.create({
      data: { ...rest, images: JSON.stringify(images) },
      include: { service: { select: { id: true, name: true, basePrice: true } } },
    });

    return jsonResponse({ ...design, images }, 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};
