import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export interface AuthenticatedUser {
  id: string
  name: string | null
  email: string
  role: "SUPER_ADMIN" | "ADMIN" | "USER"
}

export type AuthAttemptResult =
  | { status: "success"; user: AuthenticatedUser }
  | { status: "invalid" }
  | { status: "locked"; retryAfterSec: number; reason: "account_lockout" }

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name] || String(fallback))
  if (!Number.isFinite(raw)) return fallback
  return Math.max(1, Math.trunc(raw))
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function lockoutThreshold(): number {
  return envInt("AUTH_ACCOUNT_LOCK_THRESHOLD", 5)
}

function lockoutMinutes(): number {
  return envInt("AUTH_ACCOUNT_LOCK_MINUTES", 15)
}

export async function authenticateWithLockout(email: string, password: string): Promise<AuthAttemptResult> {
  const normalizedEmail = normalizeEmail(email)

  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      name: string | null
      email: string
      role: "SUPER_ADMIN" | "ADMIN" | "USER"
      password: string | null
      failedLoginCount: number
      lockedUntil: Date | null
    }>
  >`
    SELECT
      id,
      name,
      email,
      role,
      password,
      "failedLoginCount",
      "lockedUntil"
    FROM "User"
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `

  const user = rows[0]
  if (!user || !user.password) {
    return { status: "invalid" }
  }

  const now = Date.now()
  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > now) {
    const retryAfterSec = Math.max(1, Math.ceil((new Date(user.lockedUntil).getTime() - now) / 1000))
    return { status: "locked", retryAfterSec, reason: "account_lockout" }
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (isValid) {
    await prisma.$executeRaw`
      UPDATE "User"
      SET "failedLoginCount" = 0,
          "lockedUntil" = NULL
      WHERE id = ${user.id}
    `
    return {
      status: "success",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }
  }

  const threshold = lockoutThreshold()
  const minutes = lockoutMinutes()
  const nextCount = Number(user.failedLoginCount || 0) + 1
  const shouldLock = nextCount >= threshold
  const lockUntil = shouldLock ? new Date(now + minutes * 60 * 1000) : null

  await prisma.$executeRaw`
    UPDATE "User"
    SET "failedLoginCount" = ${nextCount},
        "lockedUntil" = ${lockUntil}
    WHERE id = ${user.id}
  `

  if (shouldLock) {
    return {
      status: "locked",
      retryAfterSec: minutes * 60,
      reason: "account_lockout",
    }
  }

  return { status: "invalid" }
}
