import { describe, expect, it, vi } from "vitest"
import { ListDocumentsUseCase } from "./list-documents"
import type { DocumentRepository } from "../../domain/repositories"

function createRepoMock(overrides?: Partial<DocumentRepository>): DocumentRepository {
  return {
    listDocuments: vi.fn(),
    getDocumentByIdForUser: vi.fn(),
    deleteDocumentByIdForUser: vi.fn(),
    updateKeyValuePairsByIdForUser: vi.fn(),
    ...overrides,
  } as unknown as DocumentRepository
}

describe("ListDocumentsUseCase", () => {
  it("returns validation error when userId is missing", async () => {
    const useCase = new ListDocumentsUseCase(createRepoMock())
    const result = await useCase.execute({ userId: "", page: 1, limit: 10 })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("DOCUMENT_USER_ID_REQUIRED")
    }
  })

  it("returns paginated result from repository", async () => {
    const repo = createRepoMock({
      listDocuments: vi.fn().mockResolvedValue({ documents: [], total: 0 }),
    })
    const useCase = new ListDocumentsUseCase(repo)

    const result = await useCase.execute({ userId: "u1", page: 1, limit: 10, search: "abc" })

    expect(repo.listDocuments).toHaveBeenCalledWith({ userId: "u1", page: 1, limit: 10, search: "abc" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.total).toBe(0)
    }
  })
})
