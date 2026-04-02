import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import { jsonResponse, errorResponse, paginate } from '../../../lib/utils';

const expenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const { skip, take } = paginate(page, limit);

  try {
    const [expenses, total] = await Promise.all([
      db.expense.findMany({ skip, take, orderBy: { date: 'desc' } }),
      db.expense.count(),
    ]);

    const totalAmount = await db.expense.aggregate({ _sum: { amount: true } });

    return jsonResponse({
      expenses,
      total,
      totalAmount: totalAmount._sum.amount || 0,
      page,
      limit,
    });
  } catch {
    return errorResponse('Internal server error', 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Validation failed', 400);

    const expense = await db.expense.create({
      data: {
        ...parsed.data,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
      },
    });
    return jsonResponse(expense, 201);
  } catch {
    return errorResponse('Internal server error', 500);
  }
};
