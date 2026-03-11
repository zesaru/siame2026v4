import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const findFirstMock = vi.fn()
const updateUseCaseExecuteMock = vi.fn()
const deleteUseCaseExecuteMock = vi.fn()
const parseUpdateHojaRemisionCommandMock = vi.fn()
const logDocumentViewMock = vi.fn(() => Promise.resolve())
const toHojaRemisionDtoMock = vi.fn((input) => input)

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/middleware/authorization", () => ({
  canDeleteRecords: vi.fn((role: string) => role === "ADMIN" || role === "SUPER_ADMIN"),
  canViewAllRecords: vi.fn((role: string) => role === "ADMIN" || role === "SUPER_ADMIN"),
}))
vi.mock("@/lib/db", () => ({
  prisma: {
    hojaRemision: {
      findFirst: findFirstMock,
    },
  },
}))
vi.mock("@/lib/services/file-audit.service", () => ({
  logDocumentView: logDocumentViewMock,
  extractIpAddress: vi.fn(() => "127.0.0.1"),
  extractUserAgent: vi.fn(() => "vitest"),
}))
vi.mock("@/lib/utils", () => ({
  shouldTrackView: vi.fn(() => true),
}))
vi.mock("@/modules/hojas-remision/infrastructure", () => ({
  PrismaHojaRemisionRepository: class {},
}))
vi.mock("@/modules/hojas-remision/application/mappers", () => ({
  toHojaRemisionDto: toHojaRemisionDtoMock,
}))
vi.mock("@/modules/hojas-remision/application/use-cases", () => ({
  UpdateHojaRemisionUseCase: class {
    execute = updateUseCaseExecuteMock
  },
  DeleteHojaRemisionUseCase: class {
    execute = deleteUseCaseExecuteMock
  },
}))
vi.mock("@/modules/hojas-remision/application/validation", () => ({
  parseUpdateHojaRemisionCommand: parseUpdateHojaRemisionCommandMock,
}))

describe("GET /api/hojas-remision/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("logs VIEW by default", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    findFirstMock.mockResolvedValue({ id: "h1", numeroCompleto: "HR-1" })

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/hojas-remision/h1") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "h1" }) })

    expect(res.status).toBe(200)
    expect(logDocumentViewMock).toHaveBeenCalled()
  })
})

describe("PUT /api/hojas-remision/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows admin to update another user's hoja", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
    parseUpdateHojaRemisionCommandMock.mockReturnValue({
      ok: true,
      value: { numeroCompleto: "HR N° 5-18-A/44", para: "Destino" },
    })
    findFirstMock.mockResolvedValue({ id: "h1", userId: "owner-1" })
    updateUseCaseExecuteMock.mockResolvedValue({
      ok: true,
      value: { status: "updated", hoja: { id: "h1", numeroCompleto: "HR N° 5-18-A/44" } },
    })

    const { PUT } = await import("./route")
    const req = new Request("http://localhost/api/hojas-remision/h1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroCompleto: "HR N° 5-18-A/44", para: "Destino" }),
    }) as unknown as NextRequest
    const res = await PUT(req, { params: Promise.resolve({ id: "h1" }) })

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "h1" },
      select: { id: true, userId: true },
    })
    expect(updateUseCaseExecuteMock).toHaveBeenCalledWith({
      id: "h1",
      userId: "owner-1",
      numeroCompleto: "HR N° 5-18-A/44",
      para: "Destino",
    })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ id: "h1", numeroCompleto: "HR N° 5-18-A/44" })
  })

  it("returns 404 when regular user targets another user's hoja", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } })
    parseUpdateHojaRemisionCommandMock.mockReturnValue({
      ok: true,
      value: { numeroCompleto: "HR N° 5-18-A/44" },
    })
    findFirstMock.mockResolvedValue(null)

    const { PUT } = await import("./route")
    const req = new Request("http://localhost/api/hojas-remision/h1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroCompleto: "HR N° 5-18-A/44" }),
    }) as unknown as NextRequest
    const res = await PUT(req, { params: Promise.resolve({ id: "h1" }) })

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "h1", userId: "user-1" },
      select: { id: true, userId: true },
    })
    expect(updateUseCaseExecuteMock).not.toHaveBeenCalled()
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: "Hoja de remisión no encontrada" })
  })
})

describe("DELETE /api/hojas-remision/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows admin to delete another user's hoja", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
    findFirstMock.mockResolvedValue({ id: "h1", userId: "owner-1" })
    deleteUseCaseExecuteMock.mockResolvedValue({
      ok: true,
      value: { status: "deleted" },
    })

    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/hojas-remision/h1", {
      method: "DELETE",
    }) as unknown as NextRequest
    const res = await DELETE(req, { params: Promise.resolve({ id: "h1" }) })

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "h1" },
      select: { id: true, userId: true },
    })
    expect(deleteUseCaseExecuteMock).toHaveBeenCalledWith("h1", "owner-1")
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })

  it("returns 404 when regular user targets another user's hoja", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } })

    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/hojas-remision/h1", {
      method: "DELETE",
    }) as unknown as NextRequest
    const res = await DELETE(req, { params: Promise.resolve({ id: "h1" }) })

    expect(findFirstMock).not.toHaveBeenCalled()
    expect(deleteUseCaseExecuteMock).not.toHaveBeenCalled()
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" })
  })
})
