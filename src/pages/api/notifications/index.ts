import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const notificationSchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.string().default('info'),
});

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  try {
    const notifications = await db.notification.findMany({
      where: { userId: locals.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await db.notification.count({
      where: { userId: locals.user.id, isRead: false },
    });

    return jsonResponse({ notifications, unreadCount });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = notificationSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400);

    const n = await db.notification.create({ data: parsed.data });
    return jsonResponse(n, 201);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
