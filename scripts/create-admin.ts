import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log('Usage: npx tsx scripts/create-admin.ts <email> <name> <password>');
    process.exit(1);
  }

  const [email, name, password] = args;

  const connectionString = process.env.DATABASE_URL!;
  const cleanUrl = connectionString.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
  const pool = new pg.Pool({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log(`Creating admin: ${email}...`);
    
    // Hash password (matching app logic)
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'ADMIN',
        emailVerified: true, // Admins auto-verified
        adminProfile: {
          create: { name }
        }
      }
    });

    console.log('--- Success ---');
    console.log(`Admin account created for ${user.email}`);
    console.log('You can now log in at /login');
  } catch (e: any) {
    if (e.code === 'P2002') {
      console.error('Error: Email already exists.');
    } else {
      console.error('Failed to create admin:', e);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
