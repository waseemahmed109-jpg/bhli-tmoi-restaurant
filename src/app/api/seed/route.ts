import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
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
    }

    return NextResponse.json({ message: "Seeding finished successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Seeding failed" }, { status: 500 });
  }
}
