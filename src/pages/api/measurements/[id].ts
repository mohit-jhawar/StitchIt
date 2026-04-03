import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';
import { logAction } from '../../../lib/audit';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
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

/** Returns the customerProfile.id for the current user, or null if not a customer. */
async function getCustomerProfileId(locals: App.Locals): Promise<string | null> {
  if (locals.user?.role !== 'CUSTOMER') return null;
  const profile = await db.customerProfile.findUnique({ where: { userId: locals.user.id } });
  return profile?.id ?? null;
}

/**
 * Checks whether the current user can access a measurement.
 * - ADMIN / TAILOR: always allowed
 * - CUSTOMER: only their own measurements
 */
async function canAccess(measurementCustomerId: string, locals: App.Locals): Promise<boolean> {
  if (!locals.user) return false;
  if (locals.user.role === 'ADMIN' || locals.user.role === 'TAILOR') return true;
  const profileId = await getCustomerProfileId(locals);
  return profileId === measurementCustomerId;
}

export const GET: APIRoute = async ({ locals, params }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    const m = await db.measurement.findUnique({ where: { id: params.id } });
    if (!m) return errorResponse('Not found', 404);
    if (!(await canAccess(m.customerId, locals))) return errorResponse('Forbidden', 403);
    return jsonResponse(m);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const PUT: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    const existing = await db.measurement.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse('Not found', 404);
    if (!(await canAccess(existing.customerId, locals))) return errorResponse('Forbidden', 403);

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400);

    const m = await db.measurement.update({ where: { id: params.id }, data: parsed.data });
    await logAction(locals.user.id, 'MEASUREMENT_UPDATE', 'MEASUREMENT', m.id, { name: m.name }, request);
    return jsonResponse(m);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const DELETE: APIRoute = async ({ locals, params, request }) => {
  if (!locals.user) return errorResponse('Unauthorized', 401);
  try {
    const existing = await db.measurement.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse('Not found', 404);
    if (!(await canAccess(existing.customerId, locals))) return errorResponse('Forbidden', 403);

    await db.measurement.delete({ where: { id: params.id } });
    await logAction(locals.user.id, 'MEASUREMENT_DELETE', 'MEASUREMENT', params.id, undefined, request);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
