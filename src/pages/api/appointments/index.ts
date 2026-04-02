import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { sendSystemNotification } from '../../../lib/notifications';

const appointmentSchema = z.object({
  tailorId: z.string().optional(),
  type: z.enum(['MEASUREMENT', 'TRIAL', 'CONSULTATION']),
  scheduledAt: z.string(),
  notes: z.string().optional(),
  customerId: z.string().optional(), // Required for TAILOR/ADMIN
});

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    let where: any = {};
    if (locals.user.role === 'CUSTOMER') {
      const profile = await db.customerProfile.findUnique({ where: { userId: locals.user.id } });
      if (!profile) return errorResponse('Profile not found', 404);
      where.customerId = profile.id;
    } else if (locals.user.role === 'TAILOR') {
      const profile = await db.tailorProfile.findUnique({ where: { userId: locals.user.id } });
      if (!profile) return errorResponse('Profile not found', 404);
      where.tailorId = profile.id;
    }

    const appointments = await db.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      include: {
        customer: { select: { name: true, phone: true } },
        tailor: { select: { name: true } },
      },
    });

    return jsonResponse(appointments);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  const { role, id: userId } = locals.user;
  if (role !== 'CUSTOMER' && role !== 'TAILOR' && role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = appointmentSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    let customerId: string;
    let customerUserId: string;
    let bookedByName: string;
    let bookedByRole = role;

    if (role === 'CUSTOMER') {
      const profile = await db.customerProfile.findUnique({ where: { userId } });
      if (!profile) return errorResponse('Customer profile not found', 404);
      customerId = profile.id;
      customerUserId = userId;
      bookedByName = profile.name + ' (You)';
    } else {
      if (!parsed.data.customerId) return errorResponse('customerId is required', 400);
      const profile = await db.customerProfile.findUnique({ where: { id: parsed.data.customerId } });
      if (!profile) return errorResponse('Target customer profile not found', 404);
      customerId = profile.id;
      customerUserId = profile.userId;
      
      if (role === 'TAILOR') {
        const tailor = await db.tailorProfile.findUnique({ where: { userId } });
        bookedByName = tailor ? `${tailor.name} (Tailor)` : 'Tailor';
      } else {
        bookedByName = 'Admin';
      }
    }

    // Resolve tailorId up front so we can run the capacity check before writing
    let tailorId: string | undefined = parsed.data.tailorId;
    if (!tailorId && role === 'TAILOR') {
      const tailorProfile = await db.tailorProfile.findUnique({ where: { userId } });
      tailorId = tailorProfile?.id;
    }

    // Capacity check — only when a specific tailor is assigned
    if (tailorId) {
      const tailor = await db.tailorProfile.findUnique({ where: { id: tailorId } });
      if (tailor) {
        const scheduledDate = new Date(parsed.data.scheduledAt);
        const dayStart = new Date(scheduledDate);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(scheduledDate);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const bookedCount = await db.appointment.count({
          where: {
            tailorId,
            scheduledAt: { gte: dayStart, lte: dayEnd },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
        });

        if (bookedCount >= tailor.dailyCapacity) {
          return errorResponse(
            `${tailor.name} is fully booked on this date (maximum ${tailor.dailyCapacity} appointment${tailor.dailyCapacity !== 1 ? 's' : ''} per day). Please choose a different date or tailor.`,
            409
          );
        }
      }
    }

    const appointment = await db.appointment.create({
      data: {
        customerId,
        tailorId,
        type: parsed.data.type,
        scheduledAt: new Date(parsed.data.scheduledAt),
        notes: parsed.data.notes,
        bookedById: userId,
        bookedByName,
        bookedByRole,
      },
    });

    // Notify customer
    await sendSystemNotification(
      customerUserId,
      'New Appointment Booked',
      `A ${parsed.data.type.replace(/_/g, ' ')} appointment has been scheduled for you on ${new Date(parsed.data.scheduledAt).toLocaleDateString('en-IN', { dateStyle: 'medium', timeStyle: 'short' } as any)} by ${bookedByName}.`,
      'info'
    );

    return jsonResponse(appointment, 201);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
