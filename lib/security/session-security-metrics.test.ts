import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = {
  $queryRaw: vi.fn(),
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("session-security-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns aggregate metrics", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ count: 10 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 7 }])
      .mockResolvedValueOnce([{ count: 2 }])

    const { getSessionSecurityMetrics } = await import("./session-security-metrics")
    const result = await getSessionSecurityMetrics()

    expect(result).toEqual({
      activeSessions: 10,
      usersWithMultipleActiveSessions: 3,
      policyRevocations24h: 7,
      idleRevocations24h: 2,
    })
  })
})
