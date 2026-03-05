import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("security-incidents", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("maps incidents with severity and details", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce([
        {
          id: "1",
          timestamp: new Date("2026-03-03T10:00:00.000Z"),
          action: "LOGIN_BLOCKED",
          ipAddress: "1.1.1.1",
          documentTitle: "user@example.com | persistent:ip_quarantine;retryAfter=3600s",
          userEmail: "user@example.com",
        },
        {
          id: "2",
          timestamp: new Date("2026-03-03T10:05:00.000Z"),
          action: "PASSWORD_CHANGE_BLOCKED",
          ipAddress: "2.2.2.2",
          documentTitle: "user@example.com | reason=rate_limit;retryAfter=60s",
          userEmail: "user@example.com",
        },
        {
          id: "3",
          timestamp: new Date("2026-03-03T10:06:00.000Z"),
          action: "SIGNUP_BLOCKED",
          ipAddress: "3.3.3.3",
          documentTitle: "new@example.com | persistent:ip_quarantine;retryAfter=1800s",
          userEmail: null,
        },
        {
          id: "4",
          timestamp: new Date("2026-03-03T10:07:00.000Z"),
          action: "SIGNUP_BLOCKED",
          ipAddress: "4.4.4.4",
          documentTitle: "new2@example.com | reason=email_exists",
          userEmail: null,
        },
      ])
      .mockResolvedValueOnce([{ count: 4 }])

    const { listSecurityIncidents } = await import("./security-incidents")
    const result = await listSecurityIncidents({ limit: 10, offset: 0 })

    expect(result.total).toBe(4)
    const blockedLogin = result.incidents.find((i) => i.action === "LOGIN_BLOCKED")
    const blockedPwd = result.incidents.find((i) => i.action === "PASSWORD_CHANGE_BLOCKED")
    const blockedSignupHigh = result.incidents.find((i) => i.id === "3")
    const blockedSignupMedium = result.incidents.find((i) => i.id === "4")
    expect(blockedLogin?.severity).toBe("high")
    expect(blockedLogin?.details).toContain("ip_quarantine")
    expect(blockedPwd?.severity).toBe("medium")
    expect(blockedPwd?.details).toContain("rate_limit")
    expect(blockedSignupHigh?.severity).toBe("high")
    expect(blockedSignupHigh?.details).toContain("ip_quarantine")
    expect(blockedSignupMedium?.severity).toBe("medium")
    expect(blockedSignupMedium?.details).toContain("email_exists")
    expect(result.stats.open).toBe(4)
  })

  it("upserts incident state", async () => {
    prismaMock.$executeRaw.mockResolvedValueOnce(1)

    const { upsertSecurityIncidentState } = await import("./security-incidents")
    await upsertSecurityIncidentState({
      id: "inc-1",
      status: "ack",
      note: "revisado",
      updatedByUserId: "admin-1",
    })

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1)
  })
})
