import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      id: "1",
      email: "demo@example.com",
      name: "Demo User",
    },
  })

  console.log("Created user:", user)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
