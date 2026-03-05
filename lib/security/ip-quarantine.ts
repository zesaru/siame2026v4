import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/db"

export interface QuarantinedIpRow {
  ipAddress: string
  failedCount: number
  lastAttemptAt: Date
  overrideActive: boolean
  overrideId: string | null
  overrideExpiresAt: Date | null
}

function normalizeIp(ip: string | string[] | null | undefined): string | null {
  if (!ip) return null
  const raw = Array.isArray(ip) ? ip[0] : ip
  const first = raw.split(",")[0]?.trim()
  return first || null
}

export async function hasActiveIpAllowOverride(ip: string | null | undefined): Promise<boolean> {
  const normalized = normalizeIp(ip)
  if (!normalized) return false
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "AuthIpOverride"
    WHERE "ipAddress" = ${normalized}
      AND mode = 'ALLOW'
      AND "revokedAt" IS NULL
      AND "expiresAt" > NOW()
    LIMIT 1
  `
  return rows.length > 0
}

export async function getActiveIpAllowOverrideExpiry(ip: string): Promise<Date | null> {
  const normalized = normalizeIp(ip)
  if (!normalized) return null
  const rows = await prisma.$queryRaw<Array<{ expiresAt: Date }>>`
    SELECT "expiresAt"
    FROM "AuthIpOverride"
    WHERE "ipAddress" = ${normalized}
      AND mode = 'ALLOW'
      AND "revokedAt" IS NULL
      AND "expiresAt" > NOW()
    ORDER BY "expiresAt" DESC
    LIMIT 1
  `
  return rows[0]?.expiresAt || null
}

export async function createIpAllowOverride(input: {
  ipAddress: string
  createdByUserId?: string
  reason?: string
  durationMinutes: number
}): Promise<{ id: string; expiresAt: Date }> {
  const normalized = normalizeIp(input.ipAddress)
  if (!normalized) {
    throw new Error("Invalid IP address")
  }

  const id = randomUUID()
  const duration = Math.max(1, Math.trunc(input.durationMinutes))
  const expiresAt = new Date(Date.now() + duration * 60 * 1000)

  await prisma.$executeRaw`
    INSERT INTO "AuthIpOverride" ("id", "ipAddress", "mode", "reason", "createdByUserId", "expiresAt")
    VALUES (${id}, ${normalized}, 'ALLOW', ${input.reason || null}, ${input.createdByUserId || null}, ${expiresAt})
  `

  return { id, expiresAt }
}

export async function listQuarantinedIps(input: {
  windowMinutes: number
  threshold: number
  limit?: number
}): Promise<QuarantinedIpRow[]> {
  const window = Math.max(1, Math.trunc(input.windowMinutes))
  const threshold = Math.max(1, Math.trunc(input.threshold))
  const limit = Math.max(1, Math.min(200, Math.trunc(input.limit || 100)))
  const interval = `${window} minutes`

  const rows = await prisma.$queryRaw<
    Array<{ ipAddress: string; failedCount: number; lastAttemptAt: Date; overrideId: string | null; overrideExpiresAt: Date | null }>
  >`
    WITH failed AS (
      SELECT
        "ipAddress",
        COUNT(*)::int AS "failedCount",
        MAX(timestamp) AS "lastAttemptAt"
      FROM "FileAuditLog"
      WHERE action = 'LOGIN_FAILED'
        AND "ipAddress" IS NOT NULL
        AND timestamp >= NOW() - ${interval}::interval
      GROUP BY "ipAddress"
      HAVING COUNT(*) >= ${threshold}
    ),
    active_override AS (
      SELECT id, "ipAddress", "expiresAt"
      FROM (
        SELECT
          id,
          "ipAddress",
          "expiresAt",
          ROW_NUMBER() OVER (PARTITION BY "ipAddress" ORDER BY "expiresAt" DESC) AS rn
        FROM "AuthIpOverride"
        WHERE mode = 'ALLOW'
          AND "revokedAt" IS NULL
          AND "expiresAt" > NOW()
      ) t
      WHERE t.rn = 1
    )
    SELECT
      failed."ipAddress",
      failed."failedCount",
      failed."lastAttemptAt",
      active_override.id AS "overrideId",
      active_override."expiresAt" AS "overrideExpiresAt"
    FROM failed
    LEFT JOIN active_override
      ON active_override."ipAddress" = failed."ipAddress"
    ORDER BY failed."failedCount" DESC, failed."lastAttemptAt" DESC
    LIMIT ${limit}
  `

  return rows.map((row) => ({
    ipAddress: row.ipAddress,
    failedCount: Number(row.failedCount || 0),
    lastAttemptAt: row.lastAttemptAt,
    overrideActive: !!row.overrideExpiresAt,
    overrideId: row.overrideId || null,
    overrideExpiresAt: row.overrideExpiresAt || null,
  }))
}

export async function revokeIpAllowOverride(overrideId: string): Promise<boolean> {
  const result = await prisma.$executeRaw`
    UPDATE "AuthIpOverride"
    SET "revokedAt" = NOW()
    WHERE id = ${overrideId}
      AND mode = 'ALLOW'
      AND "revokedAt" IS NULL
  `
  return Number(result) > 0
}
