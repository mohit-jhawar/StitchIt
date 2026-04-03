import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { sendSystemNotification } from '../../../lib/notifications';
import { logAction } from '../../../lib/audit';

const updateSchema = z.object({
  status: z.enum(['PENDING', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'REJECTED']).optional(),
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

async function canAccess(appointment: { customerId: string; tailorId: string | null; status: string }, locals: App.Locals): Promise<boolean> {
  if (locals.user?.role === 'ADMIN') return true;
  const profileId = await getProfileId(locals);
  if (!profileId) return false;
  if (locals.user?.role === 'CUSTOMER') return appointment.customerId === profileId;
  if (locals.user?.role === 'TAILOR') {
    // Tailor can access appointments assigned to them, or unassigned PENDING requests
    return appointment.tailorId === profileId || (appointment.tailorId === null && appointment.status === 'PENDING');
  }
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

    // When a tailor approves an open (unassigned) request, assign themselves
    let assignedTailorId = parsed.data.tailorId;
    if (
      parsed.data.status === 'SCHEDULED' &&
      existing.isOpenRequest &&
      existing.tailorId === null &&
      locals.user.role === 'TAILOR'
    ) {
      const tailorProfile = await db.tailorProfile.findUnique({ where: { userId: locals.user.id } });
      if (tailorProfile) assignedTailorId = tailorProfile.id;
    }

    const a = await db.appointment.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        tailorId: assignedTailorId,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
      },
      include: {
        customer: { select: { userId: true, name: true } },
        tailor: { select: { name: true } },
      },
    });

    // Notify customer on status changes
    if (parsed.data.status && (locals.user.role === 'TAILOR' || locals.user.role === 'ADMIN')) {
      const { status } = parsed.data;
      const typeLabel = existing.type.replace(/_/g, ' ');
      const dateLabel = new Date(a.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' } as any);
      const tailorName = a.tailor?.name || 'the tailor';
      let title = 'Appointment Updated';
      let message = '';
      let notifType: 'success' | 'info' | 'warning' = 'info';

      if (status === 'SCHEDULED') {
        title = 'Appointment Confirmed';
        message = `Your ${typeLabel} appointment on ${dateLabel} has been confirmed by ${tailorName}.`;
        notifType = 'success';
      } else if (status === 'REJECTED') {
        title = 'Appointment Rejected';
        message = `Your ${typeLabel} appointment request has been rejected. Please request a new one.`;
        notifType = 'warning';
      } else if (status === 'COMPLETED') {
        title = 'Appointment Completed';
        message = `Your ${typeLabel} appointment has been marked as completed.`;
        notifType = 'success';
      } else if (status === 'CANCELLED') {
        title = 'Appointment Cancelled';
        message = `Your ${typeLabel} appointment on ${dateLabel} has been cancelled.`;
        notifType = 'info';
      }

      if (message) {
        await sendSystemNotification(a.customer.userId, title, message, notifType);
      }

      // If a tailor just claimed an open request, notify all OTHER tailors it's been taken
      if (status === 'SCHEDULED' && existing.isOpenRequest && assignedTailorId) {
        const otherTailors = await db.tailorProfile.findMany({
          where: { id: { not: assignedTailorId } },
          select: { userId: true },
        });
        await Promise.all(
          otherTailors.map((t) =>
            sendSystemNotification(
              t.userId,
              'Open Request Taken',
              `The open ${typeLabel} appointment request for ${dateLabel} has been confirmed by ${tailorName}.`,
              'info'
            )
          )
        );
      }
    }

    await logAction(locals.user.id, 'APPOINTMENT_UPDATE', 'APPOINTMENT', a.id, {
      status: parsed.data.status,
      from: existing.status,
    }, request);

    return jsonResponse(a);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const DELETE: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    const existing = await db.appointment.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse('Not found', 404);
    if (!(await canAccess(existing, locals))) return errorResponse('Forbidden', 403);
    await db.appointment.delete({ where: { id: params.id } });
    await logAction(locals.user.id, 'APPOINTMENT_DELETE', 'APPOINTMENT', params.id, {
      type: existing.type,
      scheduledAt: existing.scheduledAt,
    }, request);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
