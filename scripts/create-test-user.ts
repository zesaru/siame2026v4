import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating test SUPER_ADMIN user...')

  const hashedPassword = await bcrypt.hash('temp123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'admin@siame.com' },
    update: {},
    create: {
      email: 'admin@siame.com',
      name: 'Cesar Admin',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      emailVerified: new Date(),
    },
  })

  console.log('Created user:', user.email, 'Role:', user.role)
  console.log('Password: temp123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
