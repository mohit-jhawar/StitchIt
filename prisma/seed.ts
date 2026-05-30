import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

let connectionString = process.env.DATABASE_URL!;
connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seeding database...');

  // ── Users ──────────────────────────────────────────────────────────────────

  const adminHash = await bcrypt.hash('admin123', 12);
  const tailorHash = await bcrypt.hash('tailor123', 12);
  const customerHash = await bcrypt.hash('customer123', 12);

  // Admin
  const adminUser = await db.user.upsert({
    where: { email: 'admin@stitchit.com' },
    update: {},
    create: {
      email: 'admin@stitchit.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      adminProfile: {
        create: { name: 'Arjun Sharma' },
      },
    },
  });

  // Tailor
  const tailorUser = await db.user.upsert({
    where: { email: 'tailor@stitchit.com' },
    update: {},
    create: {
      email: 'tailor@stitchit.com',
      passwordHash: tailorHash,
      role: 'TAILOR',
      tailorProfile: {
        create: {
          name: 'Rajan Mehta',
          phone: '+91 98765 11111',
          specialization: 'Formal Wear & Suits',
          experience: 12,
          dailyCapacity: 5,
        },
      },
    },
  });

  // Customer
  const customerUser = await db.user.upsert({
    where: { email: 'customer@stitchit.com' },
    update: {},
    create: {
      email: 'customer@stitchit.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      customerProfile: {
        create: {
          name: 'Priya Kapoor',
          phone: '+91 98765 22222',
          address: '42 MG Road, Bengaluru, Karnataka 560001',
        },
      },
    },
  });

  // Extra tailor
  const tailorHash2 = await bcrypt.hash('tailor456', 12);
  await db.user.upsert({
    where: { email: 'tailor2@stitchit.com' },
    update: {},
    create: {
      email: 'tailor2@stitchit.com',
      passwordHash: tailorHash2,
      role: 'TAILOR',
      tailorProfile: {
        create: {
          name: 'Sunita Devi',
          phone: '+91 98765 33333',
          specialization: 'Ethnic & Bridal Wear',
          experience: 8,
          dailyCapacity: 4,
        },
      },
    },
  });

  // Extra customer
  const customerHash2 = await bcrypt.hash('customer456', 12);
  await db.user.upsert({
    where: { email: 'customer2@stitchit.com' },
    update: {},
    create: {
      email: 'customer2@stitchit.com',
      passwordHash: customerHash2,
      role: 'CUSTOMER',
      customerProfile: {
        create: {
          name: 'Vikram Singh',
          phone: '+91 98765 44444',
        },
      },
    },
  });

  console.log('✅ Users created');

  // ── Services ───────────────────────────────────────────────────────────────

  const services = await Promise.all([
    db.service.upsert({
      where: { id: 'svc-suit' },
      update: {},
      create: {
        id: 'svc-suit',
        name: 'Suit Stitching',
        category: 'Formal',
        basePrice: 3500,
        estimatedDays: 10,
        complexity: 'COMPLEX',
        description: 'Full suit with jacket and trousers — impeccably tailored.',
        isActive: true,
      },
    }),
    db.service.upsert({
      where: { id: 'svc-shirt' },
      update: {},
      create: {
        id: 'svc-shirt',
        name: 'Shirt Stitching',
        category: 'Casual',
        basePrice: 800,
        estimatedDays: 5,
        complexity: 'SIMPLE',
        description: 'Custom-fit shirt in any style.',
        isActive: true,
      },
    }),
    db.service.upsert({
      where: { id: 'svc-lehenga' },
      update: {},
      create: {
        id: 'svc-lehenga',
        name: 'Lehenga',
        category: 'Ethnic',
        basePrice: 5000,
        estimatedDays: 14,
        complexity: 'COMPLEX',
        description: 'Bridal or party lehenga with intricate work.',
        isActive: true,
      },
    }),
    db.service.upsert({
      where: { id: 'svc-kurta' },
      update: {},
      create: {
        id: 'svc-kurta',
        name: 'Kurta Stitching',
        category: 'Ethnic',
        basePrice: 1200,
        estimatedDays: 7,
        complexity: 'MEDIUM',
        description: 'Traditional kurta in various styles.',
        isActive: true,
      },
    }),
    db.service.upsert({
      where: { id: 'svc-alter' },
      update: {},
      create: {
        id: 'svc-alter',
        name: 'Alterations',
        category: 'Repair',
        basePrice: 300,
        estimatedDays: 3,
        complexity: 'SIMPLE',
        description: 'Clothing alterations, repairs, and adjustments.',
        isActive: true,
      },
    }),
    db.service.upsert({
      where: { id: 'svc-saree' },
      update: {},
      create: {
        id: 'svc-saree',
        name: 'Saree Blouse',
        category: 'Ethnic',
        basePrice: 900,
        estimatedDays: 5,
        complexity: 'MEDIUM',
        description: 'Custom saree blouse stitching with any design.',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ ${services.length} services created`);

  // ── Fabrics ────────────────────────────────────────────────────────────────

  const fabrics = await Promise.all([
    db.fabric.upsert({
      where: { id: 'fab-cotton' },
      update: {},
      create: {
        id: 'fab-cotton',
        name: 'Premium Cotton',
        type: 'Cotton',
        pricePerMeter: 250,
        stockQuantity: 50,
        lowStockAlert: 10,
        color: 'White',
        description: 'Breathable premium cotton — ideal for shirts and kurtas.',
        isActive: true,
      },
    }),
    db.fabric.upsert({
      where: { id: 'fab-silk' },
      update: {},
      create: {
        id: 'fab-silk',
        name: ' Banarasi Silk',
        type: 'Silk',
        pricePerMeter: 1200,
        stockQuantity: 20,
        lowStockAlert: 5,
        color: 'Golden',
        description: 'Authentic Banarasi silk for ethnic wear.',
        isActive: true,
      },
    }),
    db.fabric.upsert({
      where: { id: 'fab-linen' },
      update: {},
      create: {
        id: 'fab-linen',
        name: 'Irish Linen',
        type: 'Linen',
        pricePerMeter: 400,
        stockQuantity: 30,
        lowStockAlert: 8,
        color: 'Beige',
        description: 'Premium linen — great for summer formal wear.',
        isActive: true,
      },
    }),
    db.fabric.upsert({
      where: { id: 'fab-georgette' },
      update: {},
      create: {
        id: 'fab-georgette',
        name: 'Georgette',
        type: 'Synthetic',
        pricePerMeter: 350,
        stockQuantity: 25,
        lowStockAlert: 5,
        color: 'Blush Pink',
        description: 'Lightweight georgette — perfect for saree blouses and ethnic wear.',
        isActive: true,
      },
    }),
    db.fabric.upsert({
      where: { id: 'fab-wool' },
      update: {},
      create: {
        id: 'fab-wool',
        name: 'Italian Wool Blend',
        type: 'Wool',
        pricePerMeter: 850,
        stockQuantity: 15,
        lowStockAlert: 3,
        color: 'Charcoal',
        description: 'Premium wool blend — perfect for formal suits.',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ ${fabrics.length} fabrics created`);

  // ── Measurements ───────────────────────────────────────────────────────────

  const customerProfile = await db.customerProfile.findUnique({
    where: { userId: customerUser.id },
  });

  if (customerProfile) {
    await db.measurement.upsert({
      where: { id: 'meas-priya-1' },
      update: {},
      create: {
        id: 'meas-priya-1',
        customerId: customerProfile.id,
        name: 'Regular Fit',
        chest: 36,
        waist: 30,
        hip: 38,
        shoulder: 15,
        sleeve: 24,
        length: 42,
        neck: 15,
        notes: 'Prefers relaxed fit with slightly longer length.',
      },
    });
    console.log('✅ Sample measurement created');
  }

  // ── Sample Orders ──────────────────────────────────────────────────────────

  const tailorProfile = await db.tailorProfile.findUnique({
    where: { userId: tailorUser.id },
  });

  if (customerProfile && tailorProfile) {
    const orderExists = await db.order.findUnique({ where: { orderNumber: 'ORDER-SEED01' } });
    if (!orderExists) {
      await db.order.create({
        data: {
          orderNumber: 'ORDER-SEED01',
          customerId: customerProfile.id,
          tailorId: tailorProfile.id,
          status: 'STITCHING',
          priority: 'NORMAL',
          totalAmount: 4300,
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          notes: 'Double-stitched seams requested.',
          items: {
            create: [
              {
                serviceId: 'svc-suit',
                fabricId: 'fab-wool',
                quantity: 1,
                unitPrice: 3500,
              },
              {
                serviceId: 'svc-shirt',
                fabricId: 'fab-cotton',
                quantity: 1,
                unitPrice: 800,
              },
            ],
          },
          timeline: {
            create: [
              { status: 'PENDING', note: 'Order received', updatedBy: customerUser.id, createdAt: new Date(Date.now() - 5 * 86400000) },
              { status: 'CONFIRMED', note: 'Payment confirmed', updatedBy: adminUser.id, createdAt: new Date(Date.now() - 4 * 86400000) },
              { status: 'FABRIC_SELECTED', note: 'Charcoal wool selected', updatedBy: tailorUser.id, createdAt: new Date(Date.now() - 3 * 86400000) },
              { status: 'CUTTING', note: 'Cutting started', updatedBy: tailorUser.id, createdAt: new Date(Date.now() - 2 * 86400000) },
              { status: 'STITCHING', note: 'Main stitching in progress', updatedBy: tailorUser.id, createdAt: new Date(Date.now() - 86400000) },
            ],
          },
        },
      });

      await db.order.create({
        data: {
          orderNumber: 'ORDER-SEED02',
          customerId: customerProfile.id,
          status: 'PENDING',
          priority: 'URGENT',
          totalAmount: 5900,
          deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          items: {
            create: [
              { serviceId: 'svc-lehenga', fabricId: 'fab-silk', quantity: 1, unitPrice: 5000 },
              { serviceId: 'svc-saree', fabricId: 'fab-georgette', quantity: 1, unitPrice: 900 },
            ],
          },
          timeline: {
            create: [
              { status: 'PENDING', note: 'Order placed', updatedBy: customerUser.id },
            ],
          },
        },
      });

      console.log('✅ Sample orders created');
    }
  }

  // ── Sample Payments ────────────────────────────────────────────────────────

  const order1 = await db.order.findUnique({ where: { orderNumber: 'ORDER-SEED01' } });
  if (order1) {
    const existingPayment = await db.payment.findFirst({ where: { orderId: order1.id } });
    if (!existingPayment) {
      await db.payment.create({
        data: {
          orderId: order1.id,
          amount: 2000,
          method: 'UPI',
          type: 'ADVANCE',
          notes: 'Advance payment via UPI',
        },
      });
      console.log('✅ Sample payment created');
    }
  }

  // ── Coupons ────────────────────────────────────────────────────────────────

  await db.coupon.upsert({
    where: { code: 'WELCOME20' },
    update: {},
    create: {
      code: 'WELCOME20',
      discountType: 'PERCENTAGE',
      value: 20,
      minOrderAmount: 1000,
      maxUsage: 500,
      isActive: true,
    },
  });

  await db.coupon.upsert({
    where: { code: 'FLAT500' },
    update: {},
    create: {
      code: 'FLAT500',
      discountType: 'FLAT',
      value: 500,
      minOrderAmount: 3000,
      maxUsage: 100,
      isActive: true,
    },
  });

  console.log('✅ Coupons created');

  // ── Notifications ──────────────────────────────────────────────────────────

  const existingNotifs = await db.notification.count({ where: { userId: customerUser.id } });
  if (existingNotifs === 0) {
    await db.notification.create({
      data: {
        userId: customerUser.id,
        title: 'Welcome to StitchIt!',
        message: 'Your account is ready. Start placing orders for a perfect fit.',
        type: 'info',
      },
    });
    await db.notification.create({
      data: {
        userId: customerUser.id,
        title: 'Order Update',
        message: 'Your order ORDER-SEED01 is now being stitched.',
        type: 'order',
      },
    });
  }

  const existingAdminNotifs = await db.notification.count({ where: { userId: adminUser.id } });
  if (existingAdminNotifs === 0) {
    await db.notification.create({
      data: {
        userId: adminUser.id,
        title: 'System Ready',
        message: 'StitchIt database seeded successfully. You are good to go!',
        type: 'info',
      },
    });
  }

  console.log('✅ Notifications created');

  console.log('\n🎉 Seed complete!\n');
  console.log('Demo accounts:');
  console.log('  Admin:    admin@stitchit.com     / admin123');
  console.log('  Tailor:   tailor@stitchit.com    / tailor123');
  console.log('  Customer: customer@stitchit.com  / customer123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
