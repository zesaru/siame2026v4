import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import type { Role } from "@prisma/client"

const SALT_ROUNDS = 12

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

/**
 * Create a new user with hashed password
 */
export async function createUser(data: {
  name: string
  email: string
  password: string
  role: Role
}) {
  const hashedPassword = await hashPassword(data.password)

  return await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })
}

/**
 * Validate user credentials for login
 */
export async function validateCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !user.password) {
    return null
  }

  const isValid = await verifyPassword(password, user.password)

  if (!isValid) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

/**
 * Check if an email already exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  return !!user
}

/**
 * Update user password
 */
export async function updatePassword(userId: string, newPassword: string) {
  const hashedPassword = await hashPassword(newPassword)

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  })
}
