import type { APIRoute } from 'astro';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse, paginate } from '../../../lib/utils';
import { hashPassword } from '../../../lib/auth';

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user || (locals.user.role !== 'ADMIN' && locals.user.role !== 'TAILOR')) {
    return errorResponse('Forbidden', 403);
  }

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const role = url.searchParams.get('role') || '';
  const { skip, take } = paginate(page, limit);

  try {
    const where: Prisma.UserWhereInput = {};
    if (role) where.role = role as 'ADMIN' | 'CUSTOMER' | 'TAILOR';

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          customerProfile: { select: { name: true, phone: true } },
          tailorProfile: { select: { id: true, name: true, phone: true, specialization: true } },
          adminProfile: { select: { name: true } },
        },
      }),
      db.user.count({ where }),
    ]);

    return jsonResponse({ users, total, page, limit, totalPages: Math.ceil(total / take) });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['CUSTOMER', 'TAILOR']),
  phone: z.string().optional(),
});

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);
  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    const { email, password, name, role, phone } = parsed.data;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return errorResponse('Email already registered', 409);

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({ data: { email, passwordHash, role } });

    if (role === 'CUSTOMER') {
      await db.customerProfile.create({ data: { userId: user.id, name, phone } });
    } else {
      await db.tailorProfile.create({ data: { userId: user.id, name, phone } });
    }

    return jsonResponse({ id: user.id, email: user.email, role: user.role, name }, 201);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
