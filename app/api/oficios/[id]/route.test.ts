import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const findFirstMock = vi.fn()
const deleteMock = vi.fn()
const createAuditLogMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }))
vi.mock("@/lib/utils", () => ({ shouldTrackView: vi.fn(() => true) }))
vi.mock("@/lib/services/file-audit.service", () => ({
  extractIpAddress: vi.fn(() => "127.0.0.1"),
  extractUserAgent: vi.fn(() => "vitest"),
}))
vi.mock("@/lib/db", () => ({
  prisma: {
    oficio: {
      findFirst: findFirstMock,
      delete: deleteMock,
    },
    fileAuditLog: {
      create: createAuditLogMock,
    },
  },
}))

describe("DELETE /api/oficios/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createAuditLogMock.mockReturnValue(Promise.resolve())
  })

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/oficios/of-1", { method: "DELETE" }) as unknown as NextRequest
    const res = await DELETE(req, { params: Promise.resolve({ id: "of-1" }) })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("returns 403 for user role", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/oficios/of-1", { method: "DELETE" }) as unknown as NextRequest
    const res = await DELETE(req, { params: Promise.resolve({ id: "of-1" }) })

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" })
  })

  it("allows superadmin role to delete", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } })
    findFirstMock.mockResolvedValue({ id: "of-1", numeroOficio: "OF-1" })
    deleteMock.mockResolvedValue({ id: "of-1" })

    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/oficios/of-1", { method: "DELETE" }) as unknown as NextRequest
    const res = await DELETE(req, { params: Promise.resolve({ id: "of-1" }) })

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "of-1", userId: "u1" },
      select: { id: true, numeroOficio: true },
    })
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "of-1" } })
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })
})
