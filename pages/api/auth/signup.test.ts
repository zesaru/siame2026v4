import { beforeEach, describe, expect, it, vi } from "vitest"

const authRateLimitCheckMock = vi.fn()
const authRateLimitRegisterFailureMock = vi.fn()
const authRateLimitRegisterSuccessMock = vi.fn()
const authPersistentGuardCheckMock = vi.fn()
const logAuthSecurityEventMock = vi.fn()
const emailExistsMock = vi.fn()
const createUserMock = vi.fn()

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

vi.mock("@/lib/services/auth.service", () => ({
  emailExists: emailExistsMock,
  createUser: createUserMock,
}))

function createReq(options?: {
  method?: string
  body?: any
  headers?: Record<string, string>
}) {
  return {
    method: options?.method || "POST",
    body: options?.body || {},
    headers: options?.headers || {},
    socket: { remoteAddress: "127.0.0.1" },
  } as any
}

function createRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: any) {
      this.body = payload
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
  }
  return res
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authPersistentGuardCheckMock.mockResolvedValue({
      allowed: true,
      reason: "ok",
      retryAfterSec: 0,
    })
  })

  it("returns 403 when origin is not trusted", async () => {
    const handler = (await import("./signup")).default
    const req = createReq({
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "Abcdefgh1234",
      },
      headers: {
        host: "localhost:3001",
        origin: "http://evil.example",
      },
    })
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(403)
    expect(res.body).toEqual({ error: "Invalid request origin" })
  })

  it("returns 429 when rate limit blocks signup", async () => {
    authRateLimitCheckMock.mockReturnValue({ allowed: false, retryAfterSec: 45 })

    const handler = (await import("./signup")).default
    const req = createReq({
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "Abcdefgh1234",
      },
      headers: {
        host: "localhost:3001",
        origin: "http://localhost:3001",
      },
    })
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(429)
    expect(res.headers["Retry-After"]).toBe("45")
  })

  it("returns 429 when persistent guard blocks signup", async () => {
    authRateLimitCheckMock.mockReturnValue({ allowed: true })
    authPersistentGuardCheckMock.mockResolvedValue({
      allowed: false,
      reason: "ip_quarantine",
      retryAfterSec: 1800,
    })

    const handler = (await import("./signup")).default
    const req = createReq({
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "Abcdefgh1234",
      },
      headers: {
        host: "localhost:3001",
        origin: "http://localhost:3001",
      },
    })
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(429)
    expect(res.headers["Retry-After"]).toBe("1800")
    expect(logAuthSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SIGNUP_BLOCKED",
      }),
    )
  })

  it("returns 400 with generic message when email already exists", async () => {
    authRateLimitCheckMock.mockReturnValue({ allowed: true })
    emailExistsMock.mockResolvedValue(true)

    const handler = (await import("./signup")).default
    const req = createReq({
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "Abcdefgh1234",
      },
      headers: {
        host: "localhost:3001",
        origin: "http://localhost:3001",
      },
    })
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: "No fue posible crear cuenta con los datos proporcionados" })
    expect(createUserMock).not.toHaveBeenCalled()
    expect(authRateLimitRegisterFailureMock).toHaveBeenCalledTimes(1)
  })

  it("returns 400 when password is weak", async () => {
    authRateLimitCheckMock.mockReturnValue({ allowed: true })
    emailExistsMock.mockResolvedValue(false)

    const handler = (await import("./signup")).default
    const req = createReq({
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "weakpassword",
      },
      headers: {
        host: "localhost:3001",
        origin: "http://localhost:3001",
      },
    })
    const res = createRes()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({
      error: "La contraseña debe tener al menos 12 caracteres, incluyendo mayúscula, minúscula y número.",
    })
    expect(createUserMock).not.toHaveBeenCalled()
  })

  it("creates a USER account successfully", async () => {
    authRateLimitCheckMock.mockReturnValue({ allowed: true })
    emailExistsMock.mockResolvedValue(false)
    createUserMock.mockResolvedValue({ id: "u-123" })

    const handler = (await import("./signup")).default
    const req = createReq({
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "Abcdefgh1234",
      },
      headers: {
        host: "localhost:3001",
        origin: "http://localhost:3001",
      },
    })
    const res = createRes()

    await handler(req, res)

    expect(createUserMock).toHaveBeenCalledWith({
      name: "Test User",
      email: "test@example.com",
      password: "Abcdefgh1234",
      role: "USER",
    })
    expect(logAuthSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "SIGNUP_SUCCESS",
        userId: "u-123",
      }),
    )
    expect(authRateLimitRegisterSuccessMock).toHaveBeenCalledTimes(1)
    expect(res.statusCode).toBe(201)
    expect(res.body).toEqual({
      message: "Usuario creado exitosamente",
      userId: "u-123",
    })
  })
})
