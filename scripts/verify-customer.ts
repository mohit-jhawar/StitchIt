import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import pg from 'pg';

let connectionString = process.env.DATABASE_URL!;
connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '').replace(/\?$/, '');
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);

async function main() {
  const db = new PrismaClient({ adapter } as any);
  const customer = await db.user.findUnique({
    where: { email: 'customer@stitchit.com' },
  });
  console.log(JSON.stringify(customer, null, 2));
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
