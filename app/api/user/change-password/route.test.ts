import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const parseChangePasswordCommandMock = vi.fn()
const executeMock = vi.fn()
const assertTrustedMutationRequestMock = vi.fn()
const authRateLimitCheckMock = vi.fn()
const authRateLimitRegisterFailureMock = vi.fn()
const authRateLimitRegisterSuccessMock = vi.fn()
const revokeAllActiveSessionsByUserIdMock = vi.fn()
const logAuthSecurityEventMock = vi.fn()
const extractIpAddressMock = vi.fn(() => "127.0.0.1")
const extractUserAgentMock = vi.fn(() => "Vitest")

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/db", () => ({ prisma: {} }))
vi.mock("@/lib/security/request-guard", () => ({
  assertTrustedMutationRequest: assertTrustedMutationRequestMock,
}))
vi.mock("@/lib/security/auth-rate-limit", () => ({
  authRateLimitCheck: authRateLimitCheckMock,
  authRateLimitRegisterFailure: authRateLimitRegisterFailureMock,
  authRateLimitRegisterSuccess: authRateLimitRegisterSuccessMock,
}))
vi.mock("@/lib/security/auth-session-registry", () => ({
  revokeAllActiveSessionsByUserId: revokeAllActiveSessionsByUserIdMock,
}))
vi.mock("@/lib/services/file-audit.service", () => ({
  logAuthSecurityEvent: logAuthSecurityEventMock,
  extractIpAddress: extractIpAddressMock,
  extractUserAgent: extractUserAgentMock,
}))
vi.mock("@/modules/usuarios/application/validation", () => ({
  parseChangePasswordCommand: parseChangePasswordCommandMock,
}))
vi.mock("@/modules/usuarios/infrastructure", () => ({
  PrismaUserRepository: class {},
}))
vi.mock("@/modules/usuarios/application/use-cases", () => ({
  ChangePasswordUseCase: class {
    execute = executeMock
  },
}))

describe("POST /api/user/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authRateLimitCheckMock.mockReturnValue({ allowed: true })
  })

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/user/change-password", {
      method: "POST",
      headers: {
        origin: "http://localhost",
      },
      body: JSON.stringify({
        currentPassword: "old12345",
        newPassword: "new12345",
      }),
    }) as unknown as NextRequest

    const res = await POST(req)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("revokes active auth sessions after successful password change", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "test@acme.test" } })
    parseChangePasswordCommandMock.mockReturnValue({
      ok: true,
      value: {
        currentPassword: "old12345",
        newPassword: "new12345",
      },
    })
    executeMock.mockResolvedValue({ ok: true, value: { status: "changed" } })
    revokeAllActiveSessionsByUserIdMock.mockResolvedValue(2)

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/user/change-password", {
      method: "POST",
      headers: {
        origin: "http://localhost",
      },
      body: JSON.stringify({
        currentPassword: "old12345",
        newPassword: "new12345",
      }),
    }) as unknown as NextRequest

    const res = await POST(req)

    expect(assertTrustedMutationRequestMock).toHaveBeenCalledTimes(1)
    expect(revokeAllActiveSessionsByUserIdMock).toHaveBeenCalledWith("u1")
    expect(authRateLimitRegisterSuccessMock).toHaveBeenCalledTimes(1)
    expect(logAuthSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SESSION_REVOKED_SELF",
        userId: "u1",
      }),
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      message: "Password changed successfully",
      requireReauth: true,
      revokedAuthSessions: 2,
    })
  })

  it("returns 400 for invalid current password", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "test@acme.test" } })
    parseChangePasswordCommandMock.mockReturnValue({
      ok: true,
      value: {
        currentPassword: "wrong12345",
        newPassword: "new12345",
      },
    })
    executeMock.mockResolvedValue({ ok: true, value: { status: "invalid_current_password" } })

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/user/change-password", {
      method: "POST",
      headers: {
        origin: "http://localhost",
      },
      body: JSON.stringify({
        currentPassword: "wrong12345",
        newPassword: "new12345",
      }),
    }) as unknown as NextRequest

    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: "Current password is incorrect" })
    expect(authRateLimitRegisterFailureMock).toHaveBeenCalledTimes(1)
    expect(logAuthSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PASSWORD_CHANGE_FAILED",
        details: "reason=invalid_current_password",
      }),
    )
    expect(revokeAllActiveSessionsByUserIdMock).not.toHaveBeenCalled()
  })

  it("returns 429 when rate limit blocks password change", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "test@acme.test" } })
    authRateLimitCheckMock.mockReturnValue({ allowed: false, retryAfterSec: 60 })

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/user/change-password", {
      method: "POST",
      headers: {
        origin: "http://localhost",
      },
      body: JSON.stringify({
        currentPassword: "old12345",
        newPassword: "new12345",
      }),
    }) as unknown as NextRequest

    const res = await POST(req)

    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("60")
    await expect(res.json()).resolves.toEqual({
      error: "Demasiados intentos. Intenta nuevamente más tarde.",
    })
    expect(logAuthSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PASSWORD_CHANGE_BLOCKED",
      }),
    )
  })
})
