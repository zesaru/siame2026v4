import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const requireRoleMock = vi.fn()
const evaluateSecurityAlertsMock = vi.fn()

vi.mock("@/lib/middleware/authorization", () => {
  class AuthorizationError extends Error {}
  return {
    requireRole: requireRoleMock,
    AuthorizationError,
  }
})

vi.mock("@/lib/security/security-alerts", () => ({
  evaluateSecurityAlerts: evaluateSecurityAlertsMock,
}))

describe("GET /api/admin/security/alerts", () => {
  const oldEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...oldEnv }
  })

  afterEach(() => {
    process.env = { ...oldEnv }
  })

  it("returns alerts with config and forwards thresholds", async () => {
    process.env.SECURITY_ALERT_WINDOW_MINUTES = "20"
    process.env.SECURITY_ALERT_LOGIN_FAILED_THRESHOLD = "30"
    process.env.SECURITY_ALERT_SESSION_POLICY_THRESHOLD = "11"
    process.env.SECURITY_ALERT_IP_QUARANTINE_THRESHOLD = "9"
    process.env.SECURITY_ALERT_PASSWORD_CHANGE_FAILED_THRESHOLD = "7"
    process.env.SECURITY_ALERT_PASSWORD_CHANGE_BLOCKED_THRESHOLD = "5"
    process.env.SECURITY_ALERT_SIGNUP_BLOCKED_THRESHOLD = "6"

    requireRoleMock.mockResolvedValue(undefined)
    evaluateSecurityAlertsMock.mockResolvedValue([{ code: "LOGIN_FAILED_SPIKE" }])

    const { GET } = await import("./route")
    const res = await GET()

    expect(requireRoleMock).toHaveBeenCalledWith(["SUPER_ADMIN"])
    expect(evaluateSecurityAlertsMock).toHaveBeenCalledWith({
      windowMinutes: 20,
      loginFailedThreshold: 30,
      sessionPolicyThreshold: 11,
      ipQuarantineBlockedThreshold: 9,
      passwordChangeFailedThreshold: 7,
      passwordChangeBlockedThreshold: 5,
      signupBlockedThreshold: 6,
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      alerts: [{ code: "LOGIN_FAILED_SPIKE" }],
      config: {
        windowMinutes: 20,
        loginFailedThreshold: 30,
        sessionPolicyThreshold: 11,
        ipQuarantineBlockedThreshold: 9,
        passwordChangeFailedThreshold: 7,
        passwordChangeBlockedThreshold: 5,
        signupBlockedThreshold: 6,
      },
    })
  })

  it("returns 403 when authorization fails", async () => {
    const { AuthorizationError } = await import("@/lib/middleware/authorization")
    requireRoleMock.mockRejectedValue(new AuthorizationError("Forbidden"))

    const { GET } = await import("./route")
    const res = await GET()

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" })
  })

  it("returns 500 on unexpected error", async () => {
    requireRoleMock.mockResolvedValue(undefined)
    evaluateSecurityAlertsMock.mockRejectedValue(new Error("boom"))

    const { GET } = await import("./route")
    const res = await GET()

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: "Error fetching security alerts" })
  })
})
