import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = {
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("auth-session-registry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns active sessions for user", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        id: "sid-1",
        userId: "u1",
        ipAddress: "127.0.0.1",
        userAgent: "Vitest",
        createdAt: new Date("2026-03-03T10:00:00.000Z"),
        lastSeenAt: new Date("2026-03-03T11:00:00.000Z"),
        expiresAt: new Date("2026-03-03T18:00:00.000Z"),
        revokedAt: null,
      },
    ])

    const { listUserActiveSessions } = await import("./auth-session-registry")
    const result = await listUserActiveSessions("u1")

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("sid-1")
  })

  it("marks session as revoked", async () => {
    prismaMock.$executeRaw.mockResolvedValueOnce(1)
    const { revokeAuthSessionById } = await import("./auth-session-registry")

    const result = await revokeAuthSessionById("sid-1", "u1")
    expect(result).toBe(true)
  })

  it("creates session and enforces max active sessions", async () => {
    prismaMock.$executeRaw
      .mockResolvedValueOnce(1) // insert
      .mockResolvedValueOnce(2) // policy revoke

    const { createAuthSession } = await import("./auth-session-registry")
    const result = await createAuthSession({
      userId: "u1",
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
      ttlSeconds: 3600,
      maxActiveSessions: 3,
    })

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(2)
    expect(result.revokedOlderCount).toBe(2)
    expect(typeof result.sessionId).toBe("string")
  })

  it("returns false when session exceeds idle timeout", async () => {
    const oldDate = new Date(Date.now() - 180 * 60 * 1000) // 180 min old
    const futureDate = new Date(Date.now() + 60 * 60 * 1000)
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        id: "sid-old",
        revokedAt: null,
        expiresAt: futureDate,
        lastSeenAt: oldDate,
      },
    ])

    const { isAuthSessionActiveWithIdleWindow } = await import("./auth-session-registry")
    const result = await isAuthSessionActiveWithIdleWindow("sid-old", 120)
    expect(result).toBe(false)
  })

  it("prunes old revoked and expired sessions", async () => {
    prismaMock.$executeRaw.mockResolvedValueOnce(4)
    const { pruneOldAuthSessions } = await import("./auth-session-registry")
    const deleted = await pruneOldAuthSessions(30)
    expect(deleted).toBe(4)
  })

  it("revokes all active sessions for a user", async () => {
    prismaMock.$executeRaw.mockResolvedValueOnce(3)
    const { revokeAllActiveSessionsByUserId } = await import("./auth-session-registry")
    const revoked = await revokeAllActiveSessionsByUserId("u1")
    expect(revoked).toBe(3)
  })
})
