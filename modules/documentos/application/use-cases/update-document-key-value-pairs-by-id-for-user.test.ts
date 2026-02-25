import { describe, expect, it, vi } from "vitest"
import { UpdateDocumentKeyValuePairsByIdForUserUseCase } from "./update-document-key-value-pairs-by-id-for-user"
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

describe("UpdateDocumentKeyValuePairsByIdForUserUseCase", () => {
  it("returns validation error when params are missing", async () => {
    const useCase = new UpdateDocumentKeyValuePairsByIdForUserUseCase(createRepoMock())
    const result = await useCase.execute("", "", [])

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("DOCUMENT_ID_OR_USER_REQUIRED")
    }
  })

  it("returns not_found when repository returns null", async () => {
    const repo = createRepoMock({
      updateKeyValuePairsByIdForUser: vi.fn().mockResolvedValue(null),
    })
    const useCase = new UpdateDocumentKeyValuePairsByIdForUserUseCase(repo)
    const result = await useCase.execute("d1", "u1", [])

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("not_found")
    }
  })

  it("returns updated document when repository succeeds", async () => {
    const repo = createRepoMock({
      updateKeyValuePairsByIdForUser: vi.fn().mockResolvedValue(documentDetail),
    })
    const useCase = new UpdateDocumentKeyValuePairsByIdForUserUseCase(repo)
    const payload = [{ key: "A", value: "B" }]
    const result = await useCase.execute("d1", "u1", payload)

    expect(repo.updateKeyValuePairsByIdForUser).toHaveBeenCalledWith({
      id: "d1",
      userId: "u1",
      keyValuePairs: payload,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("updated")
    }
  })
})
