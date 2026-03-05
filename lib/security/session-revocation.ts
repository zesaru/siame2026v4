import { prisma } from "@/lib/db"

export async function getUserSessionVersion(userId: string): Promise<number | null> {
  const rows = await prisma.$queryRaw<Array<{ sessionVersion: number }>>`
    SELECT "sessionVersion"
    FROM "User"
    WHERE id = ${userId}
    LIMIT 1
  `
  return rows[0]?.sessionVersion ?? null
}

export async function revokeUserSessionsByUserId(userId: string): Promise<number | null> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "sessionVersion" = "sessionVersion" + 1
    WHERE id = ${userId}
  `
  await prisma.$executeRaw`
    UPDATE "AuthSession"
    SET "revokedAt" = NOW()
    WHERE "userId" = ${userId}
      AND "revokedAt" IS NULL
      AND "expiresAt" > NOW()
  `
  return getUserSessionVersion(userId)
}

export async function isTokenSessionValid(userId: string, tokenSessionVersion?: number): Promise<boolean> {
  if (!userId) return false
  const currentVersion = await getUserSessionVersion(userId)
  if (currentVersion === null) return false
  return (tokenSessionVersion ?? 0) === currentVersion
}
