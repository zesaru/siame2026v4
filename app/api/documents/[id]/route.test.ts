import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const executeDeleteMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/db", () => ({ prisma: {} }))
vi.mock("@/lib/services/file-audit.service", () => ({
  logDocumentView: vi.fn(),
  extractIpAddress: vi.fn(),
  extractUserAgent: vi.fn(),
}))
vi.mock("@/modules/documentos/application/queries", () => ({
  GetDocumentByIdForUserUseCase: class {},
}))
vi.mock("@/modules/documentos/application/use-cases", () => ({
  DeleteDocumentByIdForUserUseCase: class {
    execute = executeDeleteMock
  },
  UpdateDocumentKeyValuePairsByIdForUserUseCase: class {},
}))
vi.mock("@/modules/documentos/application/mappers", () => ({
  toDocumentDetailDto: vi.fn((input) => input),
}))
vi.mock("@/modules/documentos/application/validation", () => ({
  parseUpdateDocumentKeyValuePairs: vi.fn(),
}))
vi.mock("@/modules/documentos/infrastructure", () => ({
  PrismaDocumentRepository: class {},
}))

describe("DELETE /api/documents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/documents/doc-1", { method: "DELETE" }) as unknown as NextRequest
    const res = await DELETE(req, { params: Promise.resolve({ id: "doc-1" }) })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("returns 403 for user role", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/documents/doc-1", { method: "DELETE" }) as unknown as NextRequest
    const res = await DELETE(req, { params: Promise.resolve({ id: "doc-1" }) })

    expect(res.status).toBe(403)
    await expect(res.json()).resolves.toEqual({ error: "Forbidden" })
  })

  it("allows admin role to delete", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } })
    executeDeleteMock.mockResolvedValue({
      ok: true,
      value: { status: "deleted" },
    })

    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/documents/doc-1", { method: "DELETE" }) as unknown as NextRequest
    const res = await DELETE(req, { params: Promise.resolve({ id: "doc-1" }) })

    expect(executeDeleteMock).toHaveBeenCalledWith("doc-1", "u1")
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })
})
