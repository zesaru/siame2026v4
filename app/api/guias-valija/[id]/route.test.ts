import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const findFirstMock = vi.fn()
const deleteMock = vi.fn()
const logDocumentViewMock = vi.fn(() => Promise.resolve())

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/db", () => ({
  prisma: {
    guiaValija: {
      findFirst: findFirstMock,
      delete: deleteMock,
    },
  },
}))
vi.mock("@/lib/middleware/authorization", () => ({
  canDeleteRecords: vi.fn((role: string) => role === "ADMIN" || role === "SUPER_ADMIN"),
  canViewAllRecords: vi.fn((role: string) => role === "ADMIN" || role === "SUPER_ADMIN"),
}))
vi.mock("@/lib/services/file-audit.service", () => ({
  logDocumentView: logDocumentViewMock,
  extractIpAddress: vi.fn(() => "127.0.0.1"),
  extractUserAgent: vi.fn(() => "vitest"),
}))

describe("GET /api/guias-valija/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("logs VIEW by default", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "g1",
      numeroGuia: "GV-1",
      items: [],
      precintos: [],
    })

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/guias-valija/g1") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "g1" }) })

    expect(res.status).toBe(200)
    expect(logDocumentViewMock).toHaveBeenCalled()
  })

  it("skips VIEW log when trackView=0", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "g1",
      numeroGuia: "GV-1",
      items: [],
      precintos: [],
    })

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/guias-valija/g1?trackView=0") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "g1" }) })

    expect(res.status).toBe(200)
    expect(logDocumentViewMock).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/guias-valija/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows admin to delete another user's guia", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
    findFirstMock.mockResolvedValue({ id: "g1" })
    deleteMock.mockResolvedValue({ id: "g1" })

    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/guias-valija/g1", {
      method: "DELETE",
    }) as unknown as NextRequest

    const res = await DELETE(req, { params: Promise.resolve({ id: "g1" }) })

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "g1" },
      select: { id: true },
    })
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "g1" } })
    expect(res.status).toBe(200)
  })

  it("returns 403 for a regular user", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } })

    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/guias-valija/g1", {
      method: "DELETE",
    }) as unknown as NextRequest

    const res = await DELETE(req, { params: Promise.resolve({ id: "g1" }) })

    expect(findFirstMock).not.toHaveBeenCalled()
    expect(deleteMock).not.toHaveBeenCalled()
    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" })
  })
})
