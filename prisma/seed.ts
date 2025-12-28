import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo user
  const demoUser = await prisma.user.create({
    data: {
      id: '1',
      name: 'Demo User',
      email: 'demo@example.com',
      emailVerified: new Date(),
    },
  })

  console.log('Created demo user:', demoUser)

  // Note: Account creation will be handled by NextAuth when user logs in
  // The demo user now exists and can be used for foreign key relationships

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })