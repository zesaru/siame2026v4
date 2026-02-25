import { describe, expect, it, vi } from "vitest"
import type { Role } from "@prisma/client"
import { UpdateUserUseCase } from "./update-user"
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

describe("UpdateUserUseCase", () => {
  it("returns validation error when id is missing", async () => {
    const useCase = new UpdateUserUseCase(createRepoMock())
    const result = await useCase.execute("", { name: "X" })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("USER_ID_REQUIRED")
    }
  })

  it("returns not_found when user does not exist", async () => {
    const repo = createRepoMock({
      getUserById: vi.fn().mockResolvedValue(null),
    })
    const useCase = new UpdateUserUseCase(repo)
    const result = await useCase.execute("u1", { name: "X" })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("not_found")
    }
  })

  it("returns email_exists when changing email to an existing one", async () => {
    const repo = createRepoMock({
      getUserById: vi.fn().mockResolvedValue(existingUser),
      existsByEmail: vi.fn().mockResolvedValue(true),
    })
    const useCase = new UpdateUserUseCase(repo)
    const result = await useCase.execute("u1", { email: "taken@example.com" })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("email_exists")
    }
    expect(repo.updateUser).not.toHaveBeenCalled()
  })

  it("updates user when payload is valid", async () => {
    const repo = createRepoMock({
      getUserById: vi.fn().mockResolvedValue(existingUser),
      updateUser: vi.fn().mockResolvedValue({
        ...existingUser,
        name: "Updated",
      }),
    })
    const useCase = new UpdateUserUseCase(repo)
    const result = await useCase.execute("u1", { name: "Updated" })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("updated")
    }
    expect(repo.updateUser).toHaveBeenCalledWith("u1", { name: "Updated" })
  })
})
