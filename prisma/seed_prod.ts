import { prisma } from '../src/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('Seeding production users...');

  // Create new professional credentials
  const users = [
    {
      name: 'Admin',
      username: 'admin',
      password: 'AdminUser@2026',
      role: 'ADMIN',
    },
    {
      name: 'Manager',
      username: 'manager',
      password: 'ManagerUser@2026',
      role: 'MANAGER',
    },
    {
      name: 'Staff',
      username: 'staff',
      password: 'StaffUser@2026',
      role: 'STAFF',
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
