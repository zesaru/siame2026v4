import { describe, expect, it, vi } from "vitest"
import { DeleteDocumentByIdForUserUseCase } from "./delete-document-by-id-for-user"
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

describe("DeleteDocumentByIdForUserUseCase", () => {
  it("returns validation error when params are missing", async () => {
    const useCase = new DeleteDocumentByIdForUserUseCase(createRepoMock())
    const result = await useCase.execute("", "")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("DOCUMENT_ID_OR_USER_REQUIRED")
    }
  })

  it("returns not_found when repository returns false", async () => {
    const repo = createRepoMock({
      deleteDocumentByIdForUser: vi.fn().mockResolvedValue(false),
    })
    const useCase = new DeleteDocumentByIdForUserUseCase(repo)
    const result = await useCase.execute("d1", "u1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("not_found")
    }
  })

  it("returns deleted when repository returns true", async () => {
    const repo = createRepoMock({
      deleteDocumentByIdForUser: vi.fn().mockResolvedValue(true),
    })
    const useCase = new DeleteDocumentByIdForUserUseCase(repo)
    const result = await useCase.execute("d1", "u1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("deleted")
    }
  })
})
