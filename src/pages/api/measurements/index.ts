import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const measurementSchema = z.object({
  name: z.string().min(1),
  customerId: z.string().optional(), // required when TAILOR/ADMIN creates for a customer
  chest: z.number().optional(),
  waist: z.number().optional(),
  hip: z.number().optional(),
  shoulder: z.number().optional(),
  sleeve: z.number().optional(),
  length: z.number().optional(),
  inseam: z.number().optional(),
  neck: z.number().optional(),
  notes: z.string().optional(),
});

async function getCustomerProfile(userId: string) {
  return db.customerProfile.findUnique({ where: { userId } });
}

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  try {
    let measurements;
    if (locals.user.role === 'CUSTOMER') {
      const profile = await getCustomerProfile(locals.user.id);
      if (!profile) return errorResponse('Profile not found', 404);
      measurements = await db.measurement.findMany({
        where: { customerId: profile.id },
        orderBy: { createdAt: 'desc' },
      });
    } else if (locals.user.role === 'ADMIN' || locals.user.role === 'TAILOR') {
      measurements = await db.measurement.findMany({
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      });
    }

    return jsonResponse(measurements);
  } catch (err) {
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);

  const isTailor = locals.user.role === 'TAILOR';
  const isAdmin = locals.user.role === 'ADMIN';
  const isCustomer = locals.user.role === 'CUSTOMER';

  if (!isCustomer && !isAdmin && !isTailor) {
    return errorResponse('Forbidden', 403);
  }

  try {
    const body = await request.json();
    const parsed = measurementSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    let customerId: string;
    let savedByName: string;
    let savedByRole = locals.user.role;

    if (isCustomer) {
      const profile = await getCustomerProfile(locals.user.id);
      if (!profile) return errorResponse('Customer profile not found', 404);
      customerId = profile.id;
      savedByName = profile.name + ' (You)';
    } else {
      // TAILOR or ADMIN saving on behalf of a customer
      if (!parsed.data.customerId) return errorResponse('customerId is required', 400);
      customerId = parsed.data.customerId;

      if (isTailor) {
        const tailorProfile = await db.tailorProfile.findUnique({ where: { userId: locals.user.id } });
        savedByName = tailorProfile ? `${tailorProfile.name} (Tailor)` : 'Tailor';
      } else {
        savedByName = 'Admin';
      }
    }

    const { customerId: _ignored, ...measurementData } = parsed.data;

    const measurement = await db.measurement.create({
      data: {
        ...measurementData,
        customerId,
        savedById: locals.user.id,
        savedByName,
        savedByRole,
      },
    });

    return jsonResponse(measurement, 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};
