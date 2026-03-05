import { prisma } from "@/lib/db"

export interface SessionSecurityMetrics {
  activeSessions: number
  usersWithMultipleActiveSessions: number
  policyRevocations24h: number
  idleRevocations24h: number
}

export async function getSessionSecurityMetrics(): Promise<SessionSecurityMetrics> {
  const [activeRows, multiRows, policyRows, idleRows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM "AuthSession"
      WHERE "revokedAt" IS NULL
        AND "expiresAt" > NOW()
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT "userId"
        FROM "AuthSession"
        WHERE "revokedAt" IS NULL
          AND "expiresAt" > NOW()
        GROUP BY "userId"
        HAVING COUNT(*) > 1
      ) s
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'SESSION_REVOKED_POLICY'
        AND timestamp >= NOW() - INTERVAL '24 hours'
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM "FileAuditLog"
      WHERE action = 'SESSION_REVOKED_POLICY'
        AND timestamp >= NOW() - INTERVAL '24 hours'
        AND COALESCE("documentTitle", '') LIKE '%reason=idle_or_expired%'
    `,
  ])

  return {
    activeSessions: Number(activeRows[0]?.count || 0),
    usersWithMultipleActiveSessions: Number(multiRows[0]?.count || 0),
    policyRevocations24h: Number(policyRows[0]?.count || 0),
    idleRevocations24h: Number(idleRows[0]?.count || 0),
  }
}
