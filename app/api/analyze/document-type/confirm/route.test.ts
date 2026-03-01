import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const findFirstMock = vi.fn()
const updateMock = vi.fn()
const findUniqueGuiaMock = vi.fn()
const createGuiaMock = vi.fn()
const findUniqueHojaMock = vi.fn()
const createHojaMock = vi.fn()
const findUniqueOficioMock = vi.fn()
const findFirstOficioMock = vi.fn()
const createOficioMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }))
vi.mock("@/lib/db", () => ({
  prisma: {
    document: {
      findFirst: findFirstMock,
      update: updateMock,
    },
    guiaValija: {
      findUnique: findUniqueGuiaMock,
      create: createGuiaMock,
    },
    hojaRemision: {
      findUnique: findUniqueHojaMock,
      create: createHojaMock,
    },
    oficio: {
      findUnique: findUniqueOficioMock,
      findFirst: findFirstOficioMock,
      create: createOficioMock,
    },
  },
}))

describe("POST /api/analyze/document-type/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "d1" }),
    }) as unknown as NextRequest
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 409 when manual review is required", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "d1",
      userId: "u1",
      fileName: "a.pdf",
      contentText: "x",
      metadata: {
        analysis: {
          tipoDocumento: "guia_valija",
          requiresManualReview: true,
          reviewReason: "Low confidence",
        },
      },
    })

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "d1" }),
    }) as unknown as NextRequest

    const res = await POST(req)
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({ requiresManualReview: true })
  })

  it("creates guia valija when analysis is confirmable", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "d1",
      userId: "u1",
      fileName: "a.pdf",
      contentText: "GUIA",
      metadata: {
        analysis: {
          tipoDocumento: "guia_valija",
          idioma: "español",
          direccion: "entrada",
          requiresManualReview: false,
          extractedData: { numeroGuia: "GV-1" },
          valijaClassification: { tipoValija: "ENTRADA", isExtraordinaria: false },
        },
      },
    })
    findUniqueGuiaMock.mockResolvedValue(null)
    createGuiaMock.mockResolvedValue({ id: "g1" })
    updateMock.mockResolvedValue({})

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "d1" }),
    }) as unknown as NextRequest

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      recordType: "guia_valija",
      recordId: "g1",
    })
  })

  it("uses overrides when provided", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "d1",
      userId: "u1",
      fileName: "a.pdf",
      contentText: "GUIA",
      metadata: {
        analysis: {
          tipoDocumento: "guia_valija",
          idioma: "español",
          direccion: "entrada",
          requiresManualReview: false,
          extractedData: { numeroGuia: "GV-ORIGINAL" },
          valijaClassification: { tipoValija: "ENTRADA", isExtraordinaria: false },
        },
      },
    })
    findUniqueGuiaMock.mockResolvedValue(null)
    createGuiaMock.mockResolvedValue({ id: "g-override" })
    updateMock.mockResolvedValue({})

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "d1",
        overrides: {
          extractedData: { numeroGuia: "GV-MANUAL" },
          valijaClassification: { tipoValija: "SALIDA", isExtraordinaria: true },
        },
      }),
    }) as unknown as NextRequest

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(createGuiaMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          numeroGuia: "GV-MANUAL",
          tipoValija: "SALIDA",
          isExtraordinaria: true,
        }),
      })
    )
  })

  it("returns alreadyConfirmed when metadata has existing confirmed record", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "d1",
      userId: "u1",
      fileName: "a.pdf",
      contentText: "x",
      metadata: {
        analysis: {
          tipoDocumento: "guia_valija",
          requiresManualReview: false,
        },
        confirmedRecordId: "existing-1",
        confirmedRecordType: "guia_valija",
      },
    })

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "d1" }),
    }) as unknown as NextRequest

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      alreadyConfirmed: true,
      recordId: "existing-1",
      recordType: "guia_valija",
    })
    expect(createGuiaMock).not.toHaveBeenCalled()
    expect(createHojaMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("normalizes alreadyConfirmed oficio records to a real oficio id", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "doc-oficio-legacy",
      userId: "u1",
      fileName: "oficio.pdf",
      contentText: "OFICIO",
      metadata: {
        analysis: {
          tipoDocumento: "oficio",
          requiresManualReview: false,
          extractedData: {},
        },
        confirmedRecordId: "doc-oficio-legacy",
        confirmedRecordType: "oficio",
      },
    })
    findFirstOficioMock.mockResolvedValue({ id: "of-real-1" })

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "doc-oficio-legacy" }),
    }) as unknown as NextRequest

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      alreadyConfirmed: true,
      recordType: "oficio",
      recordId: "of-real-1",
    })
    expect(createOficioMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it("confirms oficio without creating guia or hoja records", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "doc-oficio-1",
      userId: "u1",
      fileName: "oficio.pdf",
      contentText: "OFICIO",
      metadata: {
        analysis: {
          tipoDocumento: "oficio",
          requiresManualReview: false,
          extractedData: {},
        },
      },
    })
    findUniqueOficioMock.mockResolvedValue(null)
    findFirstOficioMock.mockResolvedValue(null)
    createOficioMock.mockResolvedValue({ id: "of-1" })
    updateMock.mockResolvedValue({})

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "doc-oficio-1" }),
    }) as unknown as NextRequest

    const res = await POST(req)
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      alreadyConfirmed: false,
      recordType: "oficio",
      recordId: "of-1",
    })
    expect(createGuiaMock).not.toHaveBeenCalled()
    expect(createHojaMock).not.toHaveBeenCalled()
    expect(createOficioMock).toHaveBeenCalled()
    expect(updateMock).toHaveBeenCalled()
  })
})
