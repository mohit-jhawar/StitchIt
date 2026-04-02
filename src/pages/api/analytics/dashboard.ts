import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { jsonResponse, errorResponse } from '../../../lib/utils';

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      ordersToday,
      ordersThisMonth,
      pendingOrders,
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalTailors,
      recentOrders,
      ordersByStatus,
      tailors,
      topServices,
      lowStockFabrics,
    ] = await Promise.all([
      db.order.count({ where: { createdAt: { gte: today, lte: todayEnd } } }),
      db.order.count({ where: { createdAt: { gte: thisMonthStart } } }),
      db.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'CUTTING', 'STITCHING'] } } }),
      db.order.count(),
      db.payment.aggregate({ _sum: { amount: true } }),
      db.customerProfile.count(),
      db.tailorProfile.count(),
      db.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          tailor: { select: { name: true } },
        },
      }),
      db.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      db.tailorProfile.findMany({
        include: {
          orders: { where: { createdAt: { gte: thisMonthStart } } },
        },
      }),
      db.orderItem.groupBy({
        by: ['serviceId'],
        _count: { serviceId: true },
        _sum: { unitPrice: true },
        orderBy: { _count: { serviceId: 'desc' } },
        take: 5,
      }),
      db.fabric.findMany({
        where: { isActive: true },
        select: { id: true, name: true, stockQuantity: true, lowStockAlert: true },
      }),
    ]);

    // Enrich top services with names
    const enrichedServices = await Promise.all(
      topServices.map(async (s) => {
        const service = await db.service.findUnique({ where: { id: s.serviceId }, select: { name: true } });
        return { name: service?.name || 'Unknown', count: s._count.serviceId, revenue: s._sum.unitPrice || 0 };
      })
    );

    // Revenue for last 7 days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);
      const rev = await db.payment.aggregate({
        _sum: { amount: true },
        where: { paidAt: { gte: d, lte: dEnd } },
      });
      last7Days.push({
        date: d.toISOString().split('T')[0],
        revenue: rev._sum.amount || 0,
      });
    }

    const tailorPerformance = tailors.map((t) => ({
      id: t.id,
      name: t.name,
      ordersThisMonth: t.orders.length,
      totalEarnings: t.totalEarnings,
    }));

    const lowStock = lowStockFabrics.filter((f) => f.stockQuantity <= f.lowStockAlert);

    return jsonResponse({
      stats: {
        ordersToday,
        ordersThisMonth,
        pendingOrders,
        totalOrders,
        totalRevenue: totalRevenue._sum.amount || 0,
        totalCustomers,
        totalTailors,
      },
      recentOrders,
      ordersByStatus,
      last7DaysRevenue: last7Days,
      tailorPerformance,
      topServices: enrichedServices,
      lowStockFabrics: lowStock,
    });
  } catch (err) {
    console.error(err);
    return errorResponse('Internal server error', 500);
  }
};
