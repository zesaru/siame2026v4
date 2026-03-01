import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const findFirstMock = vi.fn()
const updateMock = vi.fn()
const deleteMock = vi.fn()
const fileAuditCreateMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }))
vi.mock("@/lib/db", () => ({
  prisma: {
    oficio: {
      findFirst: findFirstMock,
      update: updateMock,
      delete: deleteMock,
    },
    fileAuditLog: {
      create: fileAuditCreateMock,
    },
  },
}))

describe("/api/oficios/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("GET returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/oficios/of-1") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "of-1" }) })
    expect(res.status).toBe(401)
  })

  it("GET returns 404 when oficio does not exist for user", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue(null)
    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/oficios/of-1") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "of-1" }) })
    expect(res.status).toBe(404)
  })

  it("GET returns oficio and writes VIEW audit log", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "of-1",
      numeroOficio: "OF-1",
      asunto: "Asunto",
      remitente: "Remitente",
      destinatario: "Destino",
      referencia: "Ref",
      contenidoTexto: "Texto",
      metadata: {},
      sourceDocumentId: "doc-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    fileAuditCreateMock.mockResolvedValue({})

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/oficios/of-1", {
      headers: { "user-agent": "vitest" },
    }) as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "of-1" }) })

    expect(res.status).toBe(200)
    expect(fileAuditCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          action: "VIEW",
          documentType: "OFICIO",
          documentId: "of-1",
        }),
      })
    )
  })

  it("GET skips VIEW audit log when trackView=0", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "of-1",
      numeroOficio: "OF-1",
      asunto: "Asunto",
      remitente: "Remitente",
      destinatario: "Destino",
      referencia: "Ref",
      contenidoTexto: "Texto",
      metadata: {},
      sourceDocumentId: "doc-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    fileAuditCreateMock.mockResolvedValue({})

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/oficios/of-1?trackView=0", {
      headers: { "user-agent": "vitest" },
    }) as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "of-1" }) })

    expect(res.status).toBe(200)
    expect(fileAuditCreateMock).not.toHaveBeenCalled()
  })

  it("PUT updates oficio fields", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({ id: "of-1" })
    updateMock.mockResolvedValue({
      id: "of-1",
      numeroOficio: "OF-100",
      asunto: "Asunto nuevo",
      remitente: "Remitente",
      destinatario: "Destino",
      referencia: "Ref",
      sourceDocumentId: "doc-1",
      updatedAt: new Date().toISOString(),
    })
    fileAuditCreateMock.mockResolvedValue({})

    const { PUT } = await import("./route")
    const req = new Request("http://localhost/api/oficios/of-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numeroOficio: "OF-100",
        asunto: "Asunto nuevo",
        remitente: "Remitente",
        destinatario: "Destino",
        referencia: "Ref",
      }),
    }) as unknown as NextRequest
    const res = await PUT(req, { params: Promise.resolve({ id: "of-1" }) })
    expect(res.status).toBe(200)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "of-1" },
        data: expect.objectContaining({
          numeroOficio: "OF-100",
          asunto: "Asunto nuevo",
          remitente: "Remitente",
          destinatario: "Destino",
          referencia: "Ref",
        }),
      })
    )
    expect(fileAuditCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "u1",
          action: "UPDATE",
          documentType: "OFICIO",
          documentId: "of-1",
        }),
      })
    )
  })

  it("DELETE removes oficio when it belongs to user", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({ id: "of-1", numeroOficio: "OF-1" })
    deleteMock.mockResolvedValue({ id: "of-1" })
    fileAuditCreateMock.mockResolvedValue({})

    const { DELETE } = await import("./route")
    const req = new Request("http://localhost/api/oficios/of-1", {
      method: "DELETE",
      headers: { "user-agent": "vitest" },
    }) as unknown as NextRequest
    const res = await DELETE(req, { params: Promise.resolve({ id: "of-1" }) })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "of-1" } })
  })
})
