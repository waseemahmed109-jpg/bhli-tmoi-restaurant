require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('Seeding production users...');

  // Setup connection to Prisma Postgres
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const users = [
    {
      username: 'admin',
      password: 'AdminUser@2026',
      role: 'admin',
    },
    {
      username: 'manager',
      password: 'ManagerUser@2026',
      role: 'manager',
    },
    {
      username: 'staff',
      password: 'StaffUser@2026',
      role: 'staff',
    }
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        password: hashedPassword,
        role: user.role,
      },
      create: {
        username: user.username,
        password: hashedPassword,
        role: user.role,
      },
    });
    console.log(`User ${user.username} created/updated.`);
  }

  console.log('Seeding finished.');
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
