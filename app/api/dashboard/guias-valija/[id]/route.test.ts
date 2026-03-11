import { beforeEach, describe, expect, it, vi } from "vitest"

const authMock = vi.fn()
const findFirstMock = vi.fn()
const updateUseCaseExecuteMock = vi.fn()
const deleteUseCaseExecuteMock = vi.fn()
const toGuiaValijaDetailDtoMock = vi.fn((input) => input)
const parseUpdateGuiaValijaCommandMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/middleware/authorization", () => ({
  canDeleteRecords: vi.fn((role: string) => role === "ADMIN" || role === "SUPER_ADMIN"),
  canViewAllRecords: vi.fn((role: string) => role === "ADMIN" || role === "SUPER_ADMIN"),
}))
vi.mock("@/lib/db", () => ({
  prisma: {
    guiaValija: {
      findFirst: findFirstMock,
    },
  },
}))
vi.mock("@/modules/guias-valija/application/queries", () => ({
  GetGuiaValijaByIdForUserUseCase: class {},
}))
vi.mock("@/modules/guias-valija/application/use-cases", () => ({
  UpdateGuiaValijaByIdForUserUseCase: class {
    execute = updateUseCaseExecuteMock
  },
  DeleteGuiaValijaByIdForUserUseCase: class {
    execute = deleteUseCaseExecuteMock
  },
}))
vi.mock("@/modules/guias-valija/application/mappers", () => ({
  toGuiaValijaDetailDto: toGuiaValijaDetailDtoMock,
}))
vi.mock("@/modules/guias-valija/application/validation", () => ({
  parseUpdateGuiaValijaCommand: parseUpdateGuiaValijaCommandMock,
}))
vi.mock("@/modules/guias-valija/infrastructure", () => ({
  PrismaGuiaValijaRepository: class {},
}))

describe("PUT /api/dashboard/guias-valija/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { PUT } = await import("./route")
    const req = new Request("http://localhost/api/dashboard/guias-valija/g1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroGuia: "01-2026" }),
    })

    const res = await PUT(req, { params: Promise.resolve({ id: "g1" }) })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("allows admin to update another user's guia", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
    parseUpdateGuiaValijaCommandMock.mockReturnValue({
      ok: true,
      value: { numeroGuia: "01-2026", estado: "recibido" },
    })
    findFirstMock
      .mockResolvedValueOnce({ id: "g1", numeroGuia: "00-2026", userId: "owner-1" })
      .mockResolvedValueOnce(null)
    updateUseCaseExecuteMock.mockResolvedValue({
      ok: true,
      value: { status: "updated", guia: { id: "g1", numeroGuia: "01-2026" } },
    })

    const { PUT } = await import("./route")
    const req = new Request("http://localhost/api/dashboard/guias-valija/g1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroGuia: "01-2026", estado: "recibido" }),
    })

    const res = await PUT(req, { params: Promise.resolve({ id: "g1" }) })

    expect(findFirstMock).toHaveBeenNthCalledWith(1, {
      where: { id: "g1" },
      select: { id: true, numeroGuia: true, userId: true },
    })
    expect(updateUseCaseExecuteMock).toHaveBeenCalledWith({
      id: "g1",
      userId: "owner-1",
      data: { numeroGuia: "01-2026", estado: "recibido" },
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ id: "g1", numeroGuia: "01-2026" })
  })

  it("returns 404 when user tries to update another user's guia", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } })
    parseUpdateGuiaValijaCommandMock.mockReturnValue({
      ok: true,
      value: { numeroGuia: "01-2026" },
    })
    findFirstMock.mockResolvedValue(null)

    const { PUT } = await import("./route")
    const req = new Request("http://localhost/api/dashboard/guias-valija/g1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroGuia: "01-2026" }),
    })

    const res = await PUT(req, { params: Promise.resolve({ id: "g1" }) })

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "g1", userId: "user-1" },
      select: { id: true, numeroGuia: true, userId: true },
    })
    expect(updateUseCaseExecuteMock).not.toHaveBeenCalled()
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: "Guía no encontrada" })
  })
})

describe("DELETE /api/dashboard/guias-valija/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows admin to delete another user's guia", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
    findFirstMock.mockResolvedValue({ id: "g1", userId: "owner-1" })
    deleteUseCaseExecuteMock.mockResolvedValue({
      ok: true,
      value: { deleted: true },
    })

    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/dashboard/guias-valija/g1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: "g1" }) })

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "g1" },
      select: { id: true, userId: true },
    })
    expect(deleteUseCaseExecuteMock).toHaveBeenCalledWith({
      id: "g1",
      userId: "owner-1",
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })

  it("returns 403 when a regular user tries to delete a guia", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } })

    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/dashboard/guias-valija/g1", {
      method: "DELETE",
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: "g1" }) })

    expect(findFirstMock).not.toHaveBeenCalled()
    expect(deleteUseCaseExecuteMock).not.toHaveBeenCalled()
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" })
  })
})
