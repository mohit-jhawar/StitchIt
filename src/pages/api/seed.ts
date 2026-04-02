import type { APIRoute } from 'astro';
import db from '../../lib/db';
import { hashPassword } from '../../lib/auth';
import { generateOrderNumber, jsonResponse, errorResponse } from '../../lib/utils';

export const POST: APIRoute = async ({ locals }) => {
  // Completely disabled in production — return 404 to avoid revealing the route exists
  if (process.env.NODE_ENV === 'production') {
    return new Response(null, { status: 404 });
  }

  if (!locals.user || locals.user.role !== 'ADMIN') return errorResponse('Forbidden', 403);

  try {
    // Check if already seeded
    const existingServices = await db.service.count();
    if (existingServices > 0) {
      return jsonResponse({ message: 'Database already seeded' });
    }

    // Seed services
    const services = await Promise.all([
      db.service.create({ data: { name: 'Suit Stitching', category: 'Formal', basePrice: 3500, estimatedDays: 10, complexity: 'COMPLEX', description: 'Full suit with jacket and trousers', isActive: true } }),
      db.service.create({ data: { name: 'Shirt Stitching', category: 'Casual', basePrice: 800, estimatedDays: 5, complexity: 'SIMPLE', description: 'Custom fit shirt', isActive: true } }),
      db.service.create({ data: { name: 'Lehenga', category: 'Ethnic', basePrice: 5000, estimatedDays: 14, complexity: 'COMPLEX', description: 'Bridal or party lehenga', isActive: true } }),
      db.service.create({ data: { name: 'Kurta Stitching', category: 'Ethnic', basePrice: 1200, estimatedDays: 7, complexity: 'MEDIUM', description: 'Traditional kurta', isActive: true } }),
      db.service.create({ data: { name: 'Alterations', category: 'Repair', basePrice: 300, estimatedDays: 3, complexity: 'SIMPLE', description: 'Clothing alterations and repairs', isActive: true } }),
    ]);

    // Seed fabrics
    await Promise.all([
      db.fabric.create({ data: { name: 'Premium Cotton', type: 'Cotton', pricePerMeter: 250, stockQuantity: 50, color: 'White', isActive: true } }),
      db.fabric.create({ data: { name: 'Silk Blend', type: 'Silk', pricePerMeter: 800, stockQuantity: 20, color: 'Ivory', isActive: true } }),
      db.fabric.create({ data: { name: 'Linen', type: 'Linen', pricePerMeter: 400, stockQuantity: 30, color: 'Beige', isActive: true } }),
      db.fabric.create({ data: { name: 'Georgette', type: 'Synthetic', pricePerMeter: 350, stockQuantity: 25, color: 'Pink', isActive: true } }),
      db.fabric.create({ data: { name: 'Wool Blend', type: 'Wool', pricePerMeter: 650, stockQuantity: 15, color: 'Navy', isActive: true } }),
    ]);

    return jsonResponse({ success: true, message: 'Seed data created successfully', servicesCount: services.length });
  } catch (err) {
    console.error('Seed error:', err);
    return errorResponse('Seed failed: ' + (err as Error).message, 500);
  }
};
