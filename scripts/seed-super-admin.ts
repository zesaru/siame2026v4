import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding super admin user...")

  const email = process.env.SUPER_ADMIN_EMAIL || "admin@siame2026.local"
  const password = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!"

  // Check if super admin already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    console.log("⚠️  Super admin already exists:", email)
    console.log("   Skipping creation.")
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12)

  // Create super admin
  const user = await prisma.user.create({
    data: {
      name: "Super Administrator",
      email,
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  })

  console.log("✅ Super admin created successfully!")
  console.log("   Email:", user.email)
  console.log("   Password:", password)
  console.log("   ⚠️  Please change the password after first login!")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding super admin:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
