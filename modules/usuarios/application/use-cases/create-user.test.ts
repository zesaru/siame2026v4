import { describe, expect, it, vi } from "vitest"
import type { Role } from "@prisma/client"
import { CreateUserUseCase } from "./create-user"
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

const createCommand = {
  name: "Test User",
  email: "test@example.com",
  password: "StrongPass123!",
  role: "USER" as Role,
}

describe("CreateUserUseCase", () => {
  it("returns email_exists when repository reports duplicate email", async () => {
    const repo = createRepoMock({
      existsByEmail: vi.fn().mockResolvedValue(true),
    })
    const useCase = new CreateUserUseCase(repo)

    const result = await useCase.execute(createCommand)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("email_exists")
    }
    expect(repo.createUser).not.toHaveBeenCalled()
  })

  it("creates user when email is available", async () => {
    const repo = createRepoMock({
      existsByEmail: vi.fn().mockResolvedValue(false),
      createUser: vi.fn().mockResolvedValue({
        id: "u1",
        name: "Test User",
        email: "test@example.com",
        role: "USER",
        createdAt: new Date(),
      }),
    })
    const useCase = new CreateUserUseCase(repo)

    const result = await useCase.execute(createCommand)

    expect(repo.existsByEmail).toHaveBeenCalledWith("test@example.com")
    expect(repo.createUser).toHaveBeenCalledWith(createCommand)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("created")
    }
  })

  it("maps Prisma unique constraint error to email_exists", async () => {
    const repo = createRepoMock({
      existsByEmail: vi.fn().mockResolvedValue(false),
      createUser: vi.fn().mockRejectedValue({ code: "P2002" }),
    })
    const useCase = new CreateUserUseCase(repo)

    const result = await useCase.execute(createCommand)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("email_exists")
    }
  })
})
