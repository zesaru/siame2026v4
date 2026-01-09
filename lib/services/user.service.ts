import { prisma } from "@/lib/db"
import type { Role } from "@prisma/client"
import * as authService from "./auth.service"

export type UserWithStats = {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: Date
  updatedAt: Date
  _count: {
    documents: number
    guiasValija: number
    hojasRemision: number
  }
}

/**
 * List all users with document counts
 */
export async function listUsers(): Promise<UserWithStats[]> {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          documents: true,
          guiasValija: true,
          hojasRemision: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          documents: true,
          guiasValija: true,
          hojasRemision: true,
        },
      },
    },
  })
}

/**
 * Create a new user
 */
export async function createUser(data: {
  name: string
  email: string
  password: string
  role: Role
}) {
  return await authService.createUser(data)
}

/**
 * Update user information
 */
export async function updateUser(
  id: string,
  data: {
    name?: string
    email?: string
    role?: Role
  }
) {
  return await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

/**
 * Delete a user
 */
export async function deleteUser(id: string) {
  return await prisma.user.delete({
    where: { id },
  })
}

/**
 * Change user password
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  })

  if (!user || !user.password) {
    throw new Error("User not found or has no password set")
  }

  // Verify current password
  const isValid = await authService.verifyPassword(currentPassword, user.password)

  if (!isValid) {
    throw new Error("Current password is incorrect")
  }

  // Update password
  await authService.updatePassword(userId, newPassword)
}
