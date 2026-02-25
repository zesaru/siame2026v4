import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const requireRoleMock = vi.fn()
const canAssignRoleMock = vi.fn()
const parseCreateUserCommandMock = vi.fn()
const listUsersExecuteMock = vi.fn()
const createUserExecuteMock = vi.fn()
const toUsersListDtoMock = vi.fn((v) => v)
const toCreatedUserDtoMock = vi.fn((v) => v)

class AuthorizationErrorMock extends Error {}

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/db", () => ({ prisma: {} }))
vi.mock("@/lib/middleware/authorization", () => ({
  requireRole: requireRoleMock,
  canAssignRole: canAssignRoleMock,
  AuthorizationError: AuthorizationErrorMock,
}))
vi.mock("@/modules/usuarios/infrastructure", () => ({
  PrismaUserRepository: class {},
}))
vi.mock("@/modules/usuarios/application/queries", () => ({
  ListUsersUseCase: class {
    execute = listUsersExecuteMock
  },
}))
vi.mock("@/modules/usuarios/application/use-cases", () => ({
  CreateUserUseCase: class {
    execute = createUserExecuteMock
  },
}))
vi.mock("@/modules/usuarios/application/mappers", () => ({
  toUsersListDto: toUsersListDtoMock,
  toCreatedUserDto: toCreatedUserDtoMock,
}))
vi.mock("@/modules/usuarios/application/validation", () => ({
  parseCreateUserCommand: parseCreateUserCommandMock,
}))

describe("/api/admin/users route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("GET returns 403 when authorization middleware rejects", async () => {
    requireRoleMock.mockRejectedValue(new AuthorizationErrorMock("Forbidden"))
    const { GET } = await import("./route")
    const res = await GET()

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" })
  })

  it("GET returns users list on success", async () => {
    requireRoleMock.mockResolvedValue(undefined)
    listUsersExecuteMock.mockResolvedValue({ ok: true, value: [{ id: "u1" }] })
    const { GET } = await import("./route")
    const res = await GET()

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual([{ id: "u1" }])
  })

  it("POST returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }) as unknown as NextRequest
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it("POST returns 400 when validation fails", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" } })
    requireRoleMock.mockResolvedValue(undefined)
    parseCreateUserCommandMock.mockReturnValue({ ok: false, error: { details: { email: ["Invalid"] } } })
    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }) as unknown as NextRequest
    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "Validation error",
      details: { email: ["Invalid"] },
    })
  })
})
