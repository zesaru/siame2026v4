import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db"

export interface ActiveAuthSession {
  id: string
  userId: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  lastSeenAt: Date
  expiresAt: Date
  revokedAt: Date | null
}

interface CreateAuthSessionInput {
  userId: string
  ipAddress?: string | null
  userAgent?: string | null
  ttlSeconds: number
  maxActiveSessions?: number
}

export async function createAuthSession(
  input: CreateAuthSessionInput,
): Promise<{ sessionId: string; expiresAt: Date; revokedOlderCount: number }> {
  const sessionId = randomUUID()
  const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000)
  const maxActiveSessions = Number.isFinite(input.maxActiveSessions)
    ? Math.max(1, Math.trunc(Number(input.maxActiveSessions)))
    : 3

  await prisma.$executeRaw`
    INSERT INTO "AuthSession" ("id", "userId", "ipAddress", "userAgent", "expiresAt")
    VALUES (${sessionId}, ${input.userId}, ${input.ipAddress ?? null}, ${input.userAgent ?? null}, ${expiresAt})
  `

  const revokedOlderCount = await enforceMaxActiveSessions(input.userId, maxActiveSessions)

  return { sessionId, expiresAt, revokedOlderCount }
}

export async function isAuthSessionActive(sessionId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ id: string; revokedAt: Date | null; expiresAt: Date; lastSeenAt: Date }>>`
    SELECT id, "revokedAt", "expiresAt", "lastSeenAt"
    FROM "AuthSession"
    WHERE id = ${sessionId}
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return false
  if (row.revokedAt) return false
  if (new Date(row.expiresAt).getTime() <= Date.now()) return false
  return true
}

export async function isAuthSessionActiveWithIdleWindow(
  sessionId: string,
  maxIdleMinutes: number,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ id: string; revokedAt: Date | null; expiresAt: Date; lastSeenAt: Date }>>`
    SELECT id, "revokedAt", "expiresAt", "lastSeenAt"
    FROM "AuthSession"
    WHERE id = ${sessionId}
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return false
  if (row.revokedAt) return false

  const now = Date.now()
  if (new Date(row.expiresAt).getTime() <= now) return false

  const idleCapMinutes = Math.max(1, Math.trunc(maxIdleMinutes))
  const idleCutoffMs = now - idleCapMinutes * 60 * 1000
  if (new Date(row.lastSeenAt).getTime() < idleCutoffMs) return false

  return true
}

export async function touchAuthSession(sessionId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "AuthSession"
    SET "lastSeenAt" = NOW()
    WHERE id = ${sessionId}
      AND "revokedAt" IS NULL
      AND "expiresAt" > NOW()
  `
}

export async function listUserActiveSessions(userId: string): Promise<ActiveAuthSession[]> {
  const rows = await prisma.$queryRaw<Array<ActiveAuthSession>>`
    SELECT "id", "userId", "ipAddress", "userAgent", "createdAt", "lastSeenAt", "expiresAt", "revokedAt"
    FROM "AuthSession"
    WHERE "userId" = ${userId}
      AND "revokedAt" IS NULL
      AND "expiresAt" > NOW()
    ORDER BY "lastSeenAt" DESC
    LIMIT 50
  `
  return rows
}

export async function revokeAuthSessionById(sessionId: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await prisma.$executeRaw`
      UPDATE "AuthSession"
      SET "revokedAt" = NOW()
      WHERE id = ${sessionId}
        AND "userId" = ${userId}
        AND "revokedAt" IS NULL
    `
    return Number(result) > 0
  }

  const result = await prisma.$executeRaw`
    UPDATE "AuthSession"
    SET "revokedAt" = NOW()
    WHERE id = ${sessionId}
      AND "revokedAt" IS NULL
  `
  return Number(result) > 0
}

export async function revokeAllActiveSessionsByUserId(userId: string): Promise<number> {
  const result = await prisma.$executeRaw`
    UPDATE "AuthSession"
    SET "revokedAt" = NOW()
    WHERE "userId" = ${userId}
      AND "revokedAt" IS NULL
      AND "expiresAt" > NOW()
  `
  return Number(result)
}

export async function pruneOldAuthSessions(retentionDays: number): Promise<number> {
  const days = Math.max(1, Math.trunc(retentionDays))
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const deleted = await prisma.$executeRaw`
    DELETE FROM "AuthSession"
    WHERE ("revokedAt" IS NOT NULL AND "revokedAt" < ${threshold})
       OR ("expiresAt" < ${threshold})
  `
  return Number(deleted)
}

export async function enforceMaxActiveSessions(userId: string, maxActiveSessions: number): Promise<number> {
  const cap = Math.max(1, Math.trunc(maxActiveSessions))
  const result = await prisma.$executeRaw`
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (
        ORDER BY "lastSeenAt" DESC, "createdAt" DESC
      ) AS rn
      FROM "AuthSession"
      WHERE "userId" = ${userId}
        AND "revokedAt" IS NULL
        AND "expiresAt" > NOW()
    )
    UPDATE "AuthSession" AS s
    SET "revokedAt" = NOW()
    FROM ranked
    WHERE s.id = ranked.id
      AND ranked.rn > ${cap}
      AND s."revokedAt" IS NULL
  `
  return Number(result)
}
