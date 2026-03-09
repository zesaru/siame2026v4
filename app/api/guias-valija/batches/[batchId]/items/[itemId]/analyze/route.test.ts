import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const itemFindFirstMock = vi.fn()
const itemUpdateMock = vi.fn()
const itemFindManyMock = vi.fn()
const batchUpdateMock = vi.fn()
const documentUpdateMock = vi.fn()
const readFileMock = vi.fn()
const analyzeMock = vi.fn()

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
    document: {
      update: documentUpdateMock,
    },
  },
}))
vi.mock("@/lib/services/file-storage.service", () => ({
  fileStorageService: {
    readFile: readFileMock,
  },
}))
vi.mock("@/modules/documentos/infrastructure", () => ({
  DefaultAzureDocumentAnalysisAdapter: class {
    analyze = analyzeMock
  },
}))

describe("POST /api/guias-valija/batches/[batchId]/items/[itemId]/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reanalyzes the item and sets it ready_review", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    itemFindFirstMock.mockResolvedValue({
      id: "item-1",
      document: {
        id: "doc-1",
        filePath: "TEMP/u1/guia.pdf",
        fileName: "guia.pdf",
        fileType: "application/pdf",
      },
    })
    readFileMock.mockResolvedValue(Buffer.from("pdf"))
    analyzeMock.mockResolvedValue({
      content: "texto",
      keyValuePairs: [],
      tables: [],
      entities: [],
      metadata: {},
    })
    itemFindManyMock.mockResolvedValue([{ analysisStatus: "ready_review" }])
    itemUpdateMock.mockResolvedValue({ id: "item-1", analysisStatus: "ready_review" })

    const { POST } = await import("./route")
    const response = await POST(new Request("http://localhost", { method: "POST" }) as unknown as NextRequest, {
      params: Promise.resolve({ batchId: "batch-1", itemId: "item-1" }),
    })

    expect(response.status).toBe(200)
    expect(documentUpdateMock).toHaveBeenCalled()
    expect(itemUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1" },
        data: expect.objectContaining({ analysisStatus: "ready_review" }),
      })
    )
  })
})
