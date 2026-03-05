import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = {
  $queryRaw: vi.fn(),
  user: {
    findUnique: vi.fn(),
  },
  fileAuditLog: {
    count: vi.fn(),
  },
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("auth-persistent-guard", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("blocks aggressively abusive IPs with quarantine reason", async () => {
    process.env.AUTH_IP_QUARANTINE_THRESHOLD = "10"
    const { authPersistentGuardCheck } = await import("./auth-persistent-guard")

    prismaMock.$queryRaw.mockResolvedValueOnce([])
    prismaMock.fileAuditLog.count.mockResolvedValueOnce(10)
    const result = await authPersistentGuardCheck({
      email: "x@example.com",
      ip: "1.2.3.4",
    })

    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.reason).toBe("ip_quarantine")
    }
  })

  it("allows unknown user when IP is below quarantine threshold", async () => {
    process.env.AUTH_IP_QUARANTINE_THRESHOLD = "50"
    const { authPersistentGuardCheck } = await import("./auth-persistent-guard")

    prismaMock.$queryRaw.mockResolvedValueOnce([])
    prismaMock.fileAuditLog.count.mockResolvedValueOnce(1)
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    const result = await authPersistentGuardCheck({
      email: "nope@example.com",
      ip: "2.3.4.5",
    })

    expect(result).toEqual({ allowed: true })
  })

  it("skips quarantine block when IP has active allow override", async () => {
    process.env.AUTH_IP_QUARANTINE_THRESHOLD = "10"
    const { authPersistentGuardCheck } = await import("./auth-persistent-guard")

    prismaMock.$queryRaw.mockResolvedValueOnce([{ id: "ovr-1" }]) // active override
    prismaMock.user.findUnique.mockResolvedValueOnce(null)
    const result = await authPersistentGuardCheck({
      email: "none@example.com",
      ip: "9.9.9.9",
    })

    expect(result).toEqual({ allowed: true })
  })
})
