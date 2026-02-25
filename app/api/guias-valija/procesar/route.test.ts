import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const executeMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({
  auth: authMock,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    separator: vi.fn(),
  },
}))

vi.mock("@/modules/guias-valija/application/use-cases", () => ({
  ProcessGuiaValijaFromAzureUseCase: class {
    execute = executeMock
  },
}))

describe("POST /api/guias-valija/procesar", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when user is not authenticated", async () => {
    authMock.mockResolvedValue(null)
    const { POST } = await import("./route")

    const req = new Request("http://localhost/api/guias-valija/procesar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }) as unknown as NextRequest

    const response = await POST(req)
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized - Authentication required",
    })
  })

  it("returns 400 when use case reports missing azureResult", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", email: "test@example.com" },
    })
    executeMock.mockResolvedValue({
      ok: false,
      error: { code: "GUIA_AZURE_RESULT_REQUIRED", message: "azureResult is required" },
    })

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/guias-valija/procesar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ azureResult: null }),
    }) as unknown as NextRequest

    const response = await POST(req)
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "azureResult is required" })
  })

  it("returns 200 with success payload", async () => {
    authMock.mockResolvedValue({
      user: { id: "u1", email: "test@example.com" },
    })
    executeMock.mockResolvedValue({
      ok: true,
      value: { success: true, guia: { id: "g1" }, message: "Guía de valija procesada exitosamente" },
    })

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/guias-valija/procesar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ azureResult: { keyValuePairs: [] }, fileName: "doc.pdf", documentId: "d1" }),
    }) as unknown as NextRequest

    const response = await POST(req)
    expect(executeMock).toHaveBeenCalledWith({
      userId: "u1",
      userEmail: "test@example.com",
      azureResult: { keyValuePairs: [] },
      fileName: "doc.pdf",
      documentId: "d1",
    })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true, guia: { id: "g1" } })
  })
})
