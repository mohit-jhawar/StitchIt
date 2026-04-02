import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { sendSystemNotification } from '../../../lib/notifications';

const updateSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  scheduledAt: z.string().optional(),
  notes: z.string().optional(),
  tailorId: z.string().optional(),
});

async function getProfileId(locals: App.Locals): Promise<string | null> {
  if (locals.user?.role === 'CUSTOMER') {
    const p = await db.customerProfile.findUnique({ where: { userId: locals.user.id } });
    return p?.id ?? null;
  }
  if (locals.user?.role === 'TAILOR') {
    const p = await db.tailorProfile.findUnique({ where: { userId: locals.user.id } });
    return p?.id ?? null;
  }
  return null; // ADMIN — no profile restriction
}

async function canAccess(appointment: { customerId: string; tailorId: string | null }, locals: App.Locals): Promise<boolean> {
  if (locals.user?.role === 'ADMIN') return true;
  const profileId = await getProfileId(locals);
  if (!profileId) return false;
  if (locals.user?.role === 'CUSTOMER') return appointment.customerId === profileId;
  if (locals.user?.role === 'TAILOR') return appointment.tailorId === profileId;
  return false;
}

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    const a = await db.appointment.findUnique({
      where: { id: params.id },
      include: { customer: true, tailor: true },
    });
    if (!a) return errorResponse('Not found', 404);
    if (!(await canAccess(a, locals))) return errorResponse('Forbidden', 403);
    return jsonResponse(a);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    const existing = await db.appointment.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse('Not found', 404);
    if (!(await canAccess(existing, locals))) return errorResponse('Forbidden', 403);

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400);

    const a = await db.appointment.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
      },
      include: { customer: { select: { userId: true, name: true } } },
    });

    // Notify customer when tailor changes appointment status
    if (parsed.data.status && locals.user.role === 'TAILOR') {
      await sendSystemNotification(
        a.customer.userId,
        'Appointment Updated',
        `Your appointment has been marked as ${parsed.data.status.replace(/_/g, ' ')}.`,
        parsed.data.status === 'COMPLETED' ? 'success' : 'info'
      );
    }

    return jsonResponse(a);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    const existing = await db.appointment.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse('Not found', 404);
    if (!(await canAccess(existing, locals))) return errorResponse('Forbidden', 403);
    await db.appointment.delete({ where: { id: params.id } });
    return jsonResponse({ success: true });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
