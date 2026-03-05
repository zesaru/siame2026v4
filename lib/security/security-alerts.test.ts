import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = {
  $queryRaw: vi.fn(),
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("security-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns alerts when thresholds are exceeded", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ count: 25 }]) // login
      .mockResolvedValueOnce([{ count: 12 }]) // policy
      .mockResolvedValueOnce([{ count: 9 }]) // blocked ip quarantine
      .mockResolvedValueOnce([{ count: 11 }]) // password change failed
      .mockResolvedValueOnce([{ count: 7 }]) // password change blocked
      .mockResolvedValueOnce([{ count: 9 }]) // signup blocked
      .mockResolvedValueOnce([{ ipAddress: "10.0.0.1", count: 20 }]) // login top ip
      .mockResolvedValueOnce([{ ipAddress: "10.0.0.2", count: 9 }]) // policy top ip
      .mockResolvedValueOnce([{ ipAddress: "10.0.0.3", count: 7 }]) // blocked top ip
      .mockResolvedValueOnce([{ ipAddress: "10.0.0.4", count: 8 }]) // password failed top ip
      .mockResolvedValueOnce([{ ipAddress: "10.0.0.5", count: 6 }]) // password blocked top ip
      .mockResolvedValueOnce([{ ipAddress: "10.0.0.6", count: 7 }]) // signup blocked top ip

    const { evaluateSecurityAlerts } = await import("./security-alerts")
    const alerts = await evaluateSecurityAlerts({
      windowMinutes: 15,
      loginFailedThreshold: 20,
      sessionPolicyThreshold: 10,
      ipQuarantineBlockedThreshold: 8,
      passwordChangeFailedThreshold: 10,
      passwordChangeBlockedThreshold: 6,
      signupBlockedThreshold: 8,
    })

    expect(alerts).toHaveLength(6)
    expect(alerts[0].code).toBe("LOGIN_FAILED_SPIKE")
    expect(alerts[1].code).toBe("SESSION_POLICY_SPIKE")
    expect(alerts[2].code).toBe("LOGIN_BLOCKED_IP_SPIKE")
    expect(alerts[3].code).toBe("PASSWORD_CHANGE_FAILED_SPIKE")
    expect(alerts[4].code).toBe("PASSWORD_CHANGE_BLOCKED_SPIKE")
    expect(alerts[5].code).toBe("SIGNUP_BLOCKED_SPIKE")
  })

  it("returns no alerts when counts are below thresholds", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const { evaluateSecurityAlerts } = await import("./security-alerts")
    const alerts = await evaluateSecurityAlerts({
      windowMinutes: 15,
      loginFailedThreshold: 20,
      sessionPolicyThreshold: 10,
      ipQuarantineBlockedThreshold: 8,
      passwordChangeFailedThreshold: 10,
      passwordChangeBlockedThreshold: 6,
      signupBlockedThreshold: 8,
    })

    expect(alerts).toEqual([])
  })
})
