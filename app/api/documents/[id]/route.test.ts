import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const getDocExecuteMock = vi.fn()
const deleteDocExecuteMock = vi.fn()
const updateDocExecuteMock = vi.fn()
const parseUpdateMock = vi.fn()
const toDocumentDetailDtoMock = vi.fn((doc) => doc)

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/db", () => ({ prisma: {} }))
vi.mock("@/lib/services/file-audit.service", () => ({
  logDocumentView: vi.fn(() => Promise.resolve()),
  extractIpAddress: vi.fn(() => "127.0.0.1"),
  extractUserAgent: vi.fn(() => "vitest"),
}))
vi.mock("@/modules/documentos/infrastructure", () => ({
  PrismaDocumentRepository: class {},
}))
vi.mock("@/modules/documentos/application/mappers", () => ({
  toDocumentDetailDto: toDocumentDetailDtoMock,
}))
vi.mock("@/modules/documentos/application/validation", () => ({
  parseUpdateDocumentKeyValuePairs: parseUpdateMock,
}))
vi.mock("@/modules/documentos/application/queries", () => ({
  GetDocumentByIdForUserUseCase: class {
    execute = getDocExecuteMock
  },
}))
vi.mock("@/modules/documentos/application/use-cases", () => ({
  DeleteDocumentByIdForUserUseCase: class {
    execute = deleteDocExecuteMock
  },
  UpdateDocumentKeyValuePairsByIdForUserUseCase: class {
    execute = updateDocExecuteMock
  },
}))

describe("/api/documents/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("GET returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/documents/d1") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "d1" }) })

    expect(res.status).toBe(401)
  })

  it("GET returns 404 when document is not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    getDocExecuteMock.mockResolvedValue({ ok: true, value: null })
    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/documents/d1") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "d1" }) })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: "Document not found" })
  })

  it("DELETE returns 200 on successful delete", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    deleteDocExecuteMock.mockResolvedValue({ ok: true, value: { status: "deleted" } })
    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/documents/d1", { method: "DELETE" }) as unknown as NextRequest
    const res = await DELETE(req, { params: Promise.resolve({ id: "d1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })

  it("PUT returns 400 when validation fails", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    parseUpdateMock.mockReturnValue({ ok: false })
    const { PUT } = await import("./route")
    const req = new Request("http://localhost/api/documents/d1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyValuePairs: "bad" }),
    }) as unknown as NextRequest

    const res = await PUT(req, { params: Promise.resolve({ id: "d1" }) })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: "keyValuePairs must be an array" })
  })
})
