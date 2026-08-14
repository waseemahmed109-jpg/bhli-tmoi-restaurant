import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const users = [
    { username: 'admin', password: 'admin9986', role: 'admin' },
    { username: 'manager', password: 'manager456', role: 'manager' },
    { username: 'owner', password: 'owner7866', role: 'owner' },
    { username: 'Bonomoli', password: 'bonomoli123', role: 'staff' },
    { username: 'Masum', password: 'masum222', role: 'staff' },
    { username: 'Nargis', password: 'nargis333', role: 'staff' },
  ]

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10)
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        password: hashedPassword,
        role: user.role,
      },
    })
  }

  // Seed Menu Items
  const menuItems = [
    { name: "Margherita Pizza", category: "Pizza", rate: 12.50 },
    { name: "Pepperoni Pizza", category: "Pizza", rate: 14.00 },
    { name: "Garlic Bread", category: "Starters", rate: 4.50 },
    { name: "Coca Cola", category: "Drinks", rate: 2.50 },
    { name: "Tiramisu", category: "Desserts", rate: 6.00 },
    { name: "Spaghetti Carbonara", category: "Pasta", rate: 13.50 },
  ]

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    })
  }

  console.log('Database seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
