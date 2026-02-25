import { describe, expect, it, vi } from "vitest"
import { ChangePasswordUseCase } from "./change-password"
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

describe("ChangePasswordUseCase", () => {
  it("returns validation error when userId is missing", async () => {
    const useCase = new ChangePasswordUseCase(createRepoMock())
    const result = await useCase.execute("", {
      currentPassword: "oldPass123!",
      newPassword: "newPass123!",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("USER_ID_REQUIRED")
    }
  })

  it("returns repository status when password change succeeds", async () => {
    const repo = createRepoMock({
      changePassword: vi.fn().mockResolvedValue({ status: "changed" }),
    })
    const useCase = new ChangePasswordUseCase(repo)
    const result = await useCase.execute("u1", {
      currentPassword: "oldPass123!",
      newPassword: "newPass123!",
    })

    expect(repo.changePassword).toHaveBeenCalledWith({
      userId: "u1",
      currentPassword: "oldPass123!",
      newPassword: "newPass123!",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("changed")
    }
  })

  it("returns invalid_current_password when repository reports it", async () => {
    const repo = createRepoMock({
      changePassword: vi.fn().mockResolvedValue({ status: "invalid_current_password" }),
    })
    const useCase = new ChangePasswordUseCase(repo)
    const result = await useCase.execute("u1", {
      currentPassword: "wrong",
      newPassword: "newPass123!",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("invalid_current_password")
    }
  })
})
