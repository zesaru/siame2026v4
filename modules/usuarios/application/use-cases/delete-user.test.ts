import { describe, expect, it, vi } from "vitest"
import type { Role } from "@prisma/client"
import { DeleteUserUseCase } from "./delete-user"
import type { UserRepository } from "../../domain/repositories"

function createRepoMock(overrides?: Partial<UserRepository>): UserRepository {
  return {
    listUsers: vi.fn(),
    existsByEmail: vi.fn(),
    createUser: vi.fn(),
    getUserById: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    changePassword: vi.fn(),
    ...overrides,
  } as unknown as UserRepository
}

const existingUser = {
  id: "u1",
  name: "Current",
  email: "current@example.com",
  role: "USER" as Role,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { documents: 0, guiasValija: 0, hojasRemision: 0 },
}

describe("DeleteUserUseCase", () => {
  it("returns validation error when id is missing", async () => {
    const useCase = new DeleteUserUseCase(createRepoMock())
    const result = await useCase.execute("")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("USER_ID_REQUIRED")
    }
  })

  it("returns not_found when user does not exist", async () => {
    const repo = createRepoMock({ getUserById: vi.fn().mockResolvedValue(null) })
    const useCase = new DeleteUserUseCase(repo)
    const result = await useCase.execute("u1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("not_found")
    }
  })

  it("deletes user when it exists", async () => {
    const repo = createRepoMock({
      getUserById: vi.fn().mockResolvedValue(existingUser),
      deleteUser: vi.fn().mockResolvedValue(undefined),
    })
    const useCase = new DeleteUserUseCase(repo)
    const result = await useCase.execute("u1")

    expect(repo.deleteUser).toHaveBeenCalledWith("u1")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("deleted")
    }
  })
})
