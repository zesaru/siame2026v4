import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const batchCreateMock = vi.fn()
const batchUpdateMock = vi.fn()
const batchItemCreateMock = vi.fn()
const batchItemFindManyMock = vi.fn()
const documentFindUniqueMock = vi.fn()
const analyzeExecuteMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }))
vi.mock("@/lib/db", () => ({
  prisma: {
    guiaValijaUploadBatch: {
      create: batchCreateMock,
      update: batchUpdateMock,
    },
    guiaValijaUploadBatchItem: {
      create: batchItemCreateMock,
      findMany: batchItemFindManyMock,
    },
    document: {
      findUnique: documentFindUniqueMock,
    },
  },
}))
vi.mock("@/modules/documentos/application/use-cases", () => ({
  AnalyzeDocumentFileUseCase: class {
    execute = analyzeExecuteMock
  },
}))
vi.mock("@/modules/documentos/infrastructure", () => ({
  DefaultAzureDocumentAnalysisAdapter: class {},
}))

describe("POST /api/guias-valija/batches", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValue(null)
    const { POST } = await import("./route")
    const formData = new FormData()
    const req = new Request("http://localhost/api/guias-valija/batches", { method: "POST", body: formData }) as unknown as NextRequest
    const response = await POST(req)

    expect(response.status).toBe(401)
  })

  it("creates a batch and stores analyzed items", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    batchCreateMock.mockResolvedValue({ id: "batch-1" })
    analyzeExecuteMock.mockResolvedValue({
      ok: true,
      value: {
        documentId: "doc-1",
        content: "texto",
        keyValuePairs: [],
        tables: [],
        entities: [],
        metadata: {},
      },
    })
    documentFindUniqueMock.mockResolvedValue({ filePath: "TEMP/u1/guia.pdf" })
    batchItemFindManyMock.mockResolvedValue([{ analysisStatus: "ready_review" }])
    batchUpdateMock.mockResolvedValue({
      id: "batch-1",
      totalFiles: 1,
      readyCount: 1,
      savedCount: 0,
      failedCount: 0,
      status: "ready_review",
      items: [{ id: "item-1" }],
    })

    const { POST } = await import("./route")
    const formData = new FormData()
    formData.append("files", new File(["pdf"], "guia.pdf", { type: "application/pdf" }))
    const req = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest
    const response = await POST(req)

    expect(response.status).toBe(201)
    expect(batchCreateMock).toHaveBeenCalledWith({
      data: { userId: "u1", totalFiles: 1 },
    })
    expect(batchItemCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          batchId: "batch-1",
          documentId: "doc-1",
          analysisStatus: "ready_review",
        }),
      })
    )
  })
})
