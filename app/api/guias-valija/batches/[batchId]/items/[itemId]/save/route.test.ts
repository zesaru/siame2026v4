import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const itemFindFirstMock = vi.fn()
const itemUpdateMock = vi.fn()
const itemFindManyMock = vi.fn()
const batchUpdateMock = vi.fn()
const processExecuteMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }))
vi.mock("@/lib/db", () => ({
  prisma: {
    guiaValijaUploadBatchItem: {
      findFirst: itemFindFirstMock,
      update: itemUpdateMock,
      findMany: itemFindManyMock,
    },
    guiaValijaUploadBatch: {
      update: batchUpdateMock,
    },
  },
}))
vi.mock("@/modules/guias-valija/application/use-cases", () => ({
  ProcessGuiaValijaFromAzureUseCase: class {
    execute = processExecuteMock
  },
}))

describe("POST /api/guias-valija/batches/[batchId]/items/[itemId]/save", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns alreadySaved when item was already persisted", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "test@example.com" } })
    itemFindFirstMock.mockResolvedValue({
      id: "item-1",
      analysisStatus: "saved",
      guiaValijaId: "g-1",
    })

    const { POST } = await import("./route")
    const req = new Request("http://localhost", { method: "POST", body: JSON.stringify({}) }) as unknown as NextRequest
    const response = await POST(req, { params: Promise.resolve({ batchId: "batch-1", itemId: "item-1" }) })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, guia: { id: "g-1" }, alreadySaved: true })
  })

  it("saves current batch item as guia valija", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", email: "test@example.com" } })
    itemFindFirstMock.mockResolvedValue({
      id: "item-1",
      documentId: "doc-1",
      fileName: "guia.pdf",
      analysisStatus: "ready_review",
      analysisResult: { keyValuePairs: [] },
      guiaValijaId: null,
    })
    processExecuteMock.mockResolvedValue({
      ok: true,
      value: { success: true, guia: { id: "g-1", numeroGuia: "01-2026" } },
    })
    itemFindManyMock.mockResolvedValue([{ analysisStatus: "saved" }])

    const { POST } = await import("./route")
    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ azureResult: { keyValuePairs: [{ key: "PARA", value: "TOKIO" }] } }),
    }) as unknown as NextRequest
    const response = await POST(req, { params: Promise.resolve({ batchId: "batch-1", itemId: "item-1" }) })

    expect(response.status).toBe(200)
    expect(itemUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({
          guiaValijaId: "g-1",
          analysisStatus: "saved",
        }),
      })
    )
  })
})
