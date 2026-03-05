import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("ip-quarantine", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("lists quarantined IPs with override flag", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        ipAddress: "1.2.3.4",
        failedCount: 90,
        lastAttemptAt: new Date("2026-03-03T10:00:00.000Z"),
        overrideId: null,
        overrideExpiresAt: null,
      },
    ])

    const { listQuarantinedIps } = await import("./ip-quarantine")
    const result = await listQuarantinedIps({
      windowMinutes: 60,
      threshold: 80,
      limit: 10,
    })

    expect(result).toHaveLength(1)
    expect(result[0].overrideActive).toBe(false)
  })

  it("creates allow override", async () => {
    prismaMock.$executeRaw.mockResolvedValueOnce(1)

    const { createIpAllowOverride } = await import("./ip-quarantine")
    const result = await createIpAllowOverride({
      ipAddress: "1.2.3.4",
      durationMinutes: 120,
      reason: "manual",
      createdByUserId: "admin-1",
    })

    expect(typeof result.id).toBe("string")
    expect(result.expiresAt).toBeInstanceOf(Date)
  })

  it("revokes allow override", async () => {
    prismaMock.$executeRaw.mockResolvedValueOnce(1)
    const { revokeIpAllowOverride } = await import("./ip-quarantine")
    const result = await revokeIpAllowOverride("ovr-1")
    expect(result).toBe(true)
  })
})
