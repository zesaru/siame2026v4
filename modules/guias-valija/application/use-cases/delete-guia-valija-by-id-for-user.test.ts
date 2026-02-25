import { describe, expect, it, vi } from "vitest"
import { DeleteGuiaValijaByIdForUserUseCase } from "./delete-guia-valija-by-id-for-user"
import type { GuiaValijaRepository } from "../../domain/repositories"

function createRepoMock(overrides?: Partial<GuiaValijaRepository>): GuiaValijaRepository {
  return {
    listByUser: vi.fn(),
    findByIdForUser: vi.fn(),
    deleteByIdForUser: vi.fn(),
    findOwnedSummaryById: vi.fn(),
    existsByNumeroGuia: vi.fn(),
    updateByIdForUser: vi.fn(),
    createForUser: vi.fn(),
    ...overrides,
  } as unknown as GuiaValijaRepository
}

describe("DeleteGuiaValijaByIdForUserUseCase", () => {
  it("returns validation error when id/userId is missing", async () => {
    const useCase = new DeleteGuiaValijaByIdForUserUseCase(createRepoMock())
    const result = await useCase.execute({ id: "", userId: "" })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("GUIA_ID_OR_USER_REQUIRED")
    }
  })

  it("returns deleted=true when repository deletes record", async () => {
    const repo = createRepoMock({
      deleteByIdForUser: vi.fn().mockResolvedValue(true),
    })
    const useCase = new DeleteGuiaValijaByIdForUserUseCase(repo)

    const result = await useCase.execute({ id: "g1", userId: "u1" })

    expect(repo.deleteByIdForUser).toHaveBeenCalledWith({ id: "g1", userId: "u1" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.deleted).toBe(true)
    }
  })
})
