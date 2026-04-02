import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { jsonResponse, errorResponse } from '../../../../lib/utils';

export const PATCH: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  try {
    const n = await db.notification.update({
      where: { id: params.id },
      data: { isRead: true },
    });
    return jsonResponse(n);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
