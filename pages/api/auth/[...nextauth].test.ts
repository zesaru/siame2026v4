import { beforeEach, describe, expect, it, vi } from "vitest"

const authenticateWithLockoutMock = vi.fn()
const getUserSessionVersionMock = vi.fn()
const createAuthSessionMock = vi.fn()
const authRateLimitCheckMock = vi.fn()
const authRateLimitRegisterFailureMock = vi.fn()
const authRateLimitRegisterSuccessMock = vi.fn()
const authPersistentGuardCheckMock = vi.fn()
const logAuthSecurityEventMock = vi.fn()
const isAuthSessionActiveWithIdleWindowMock = vi.fn()
const revokeAuthSessionByIdMock = vi.fn()
const touchAuthSessionMock = vi.fn()

vi.mock("@/lib/security/account-lockout", () => ({
  authenticateWithLockout: authenticateWithLockoutMock,
}))

vi.mock("@/lib/security/session-revocation", () => ({
  getUserSessionVersion: getUserSessionVersionMock,
}))

vi.mock("@/lib/security/auth-session-registry", () => ({
  createAuthSession: createAuthSessionMock,
  isAuthSessionActiveWithIdleWindow: isAuthSessionActiveWithIdleWindowMock,
  revokeAuthSessionById: revokeAuthSessionByIdMock,
  touchAuthSession: touchAuthSessionMock,
}))

vi.mock("@/lib/security/auth-rate-limit", () => ({
  authRateLimitCheck: authRateLimitCheckMock,
  authRateLimitRegisterFailure: authRateLimitRegisterFailureMock,
  authRateLimitRegisterSuccess: authRateLimitRegisterSuccessMock,
}))

vi.mock("@/lib/security/auth-persistent-guard", () => ({
  authPersistentGuardCheck: authPersistentGuardCheckMock,
}))

vi.mock("@/lib/services/file-audit.service", () => ({
  logAuthSecurityEvent: logAuthSecurityEventMock,
}))

describe("nextauth runtime config", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authRateLimitCheckMock.mockReturnValue({ allowed: true })
    authPersistentGuardCheckMock.mockResolvedValue({ allowed: true })
    getUserSessionVersionMock.mockResolvedValue(4)
    createAuthSessionMock.mockResolvedValue({
      sessionId: "sid-1",
      revokedOlderCount: 0,
    })
    isAuthSessionActiveWithIdleWindowMock.mockResolvedValue(true)
    revokeAuthSessionByIdMock.mockResolvedValue(true)
    touchAuthSessionMock.mockResolvedValue(undefined)
    logAuthSecurityEventMock.mockResolvedValue(undefined)
  })

  it("does not expose a prisma adapter anymore", async () => {
    const { authOptions } = await import("./[...nextauth]")

    expect(authOptions.adapter).toBeUndefined()
    expect(authOptions.session?.strategy).toBe("jwt")
    expect(authOptions.providers).toHaveLength(1)
  })

  it("stores custom session fields in the JWT callback without adapter persistence", async () => {
    const { authOptions } = await import("./[...nextauth]")

    const token = await authOptions.callbacks?.jwt?.({
      token: {},
      user: {
        id: "u1",
        email: "user@example.com",
        name: "User",
        role: "ADMIN",
        sessionVersion: 4,
        sessionId: "sid-1",
      } as never,
    } as never)

    expect(token).toMatchObject({
      id: "u1",
      role: "ADMIN",
      sid: "sid-1",
      sessionVersion: 4,
      revoked: false,
    })
  })

  it("marks revoked sessions as null in the session callback", async () => {
    const { authOptions } = await import("./[...nextauth]")

    const result = await authOptions.callbacks?.session?.({
      session: {
        user: { name: "User", email: "user@example.com", image: null },
        expires: new Date().toISOString(),
      },
      token: { revoked: true } as never,
    } as never)

    expect(result).toBeNull()
  })
})
