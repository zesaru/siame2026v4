import { describe, expect, it, vi } from "vitest"
import { GetDocumentByIdForUserUseCase } from "./get-document-by-id-for-user"
import type { DocumentDetailRow, DocumentRepository } from "../../domain/repositories"

function createRepoMock(overrides?: Partial<DocumentRepository>): DocumentRepository {
  return {
    listDocuments: vi.fn(),
    getDocumentByIdForUser: vi.fn(),
    deleteDocumentByIdForUser: vi.fn(),
    updateKeyValuePairsByIdForUser: vi.fn(),
    ...overrides,
  } as unknown as DocumentRepository
}

const documentDetail: DocumentDetailRow = {
  id: "d1",
  userId: "u1",
  fileName: "doc.pdf",
  filePath: "TEMP/1/doc.pdf",
  fileSize: 123,
  fileType: "application/pdf",
  fileExtension: "pdf",
  contentText: null,
  metadata: {},
  extractedData: null,
  keyValuePairs: [],
  tables: [],
  entities: [],
  pageCount: 1,
  language: "es",
  tableCount: 0,
  keyValueCount: 0,
  entityCount: 0,
  processingStatus: "completed",
  errorMessage: null,
  analyzedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe("GetDocumentByIdForUserUseCase", () => {
  it("returns validation error when params are missing", async () => {
    const useCase = new GetDocumentByIdForUserUseCase(createRepoMock())
    const result = await useCase.execute("", "")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("DOCUMENT_ID_OR_USER_REQUIRED")
    }
  })

  it("returns document when repository finds it", async () => {
    const repo = createRepoMock({
      getDocumentByIdForUser: vi.fn().mockResolvedValue(documentDetail),
    })
    const useCase = new GetDocumentByIdForUserUseCase(repo)
    const result = await useCase.execute("d1", "u1")

    expect(repo.getDocumentByIdForUser).toHaveBeenCalledWith({ id: "d1", userId: "u1" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value?.id).toBe("d1")
    }
  })
})
