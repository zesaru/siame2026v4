import { beforeEach, describe, expect, it, vi } from "vitest"

const hashMock = vi.fn()
const compareMock = vi.fn()

const prismaMock = {
  user: {
    update: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}

vi.mock("bcryptjs", () => ({
  default: {
    hash: hashMock,
    compare: compareMock,
  },
}))

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("hashPassword delegates to bcrypt", async () => {
    hashMock.mockResolvedValue("hashed-value")
    const { hashPassword } = await import("./auth.service")

    const result = await hashPassword("Secret12345Aa")

    expect(hashMock).toHaveBeenCalledWith("Secret12345Aa", 12)
    expect(result).toBe("hashed-value")
  })

  it("verifyPassword delegates to bcrypt", async () => {
    compareMock.mockResolvedValue(true)
    const { verifyPassword } = await import("./auth.service")

    const result = await verifyPassword("Secret12345Aa", "hash")

    expect(compareMock).toHaveBeenCalledWith("Secret12345Aa", "hash")
    expect(result).toBe(true)
  })

  it("updatePassword resets lockout fields and increments session version", async () => {
    hashMock.mockResolvedValue("new-hash")
    prismaMock.user.update.mockResolvedValue({ id: "u1" })
    const { updatePassword } = await import("./auth.service")

    await updatePassword("u1", "NewPassword123A")

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        password: "new-hash",
        failedLoginCount: 0,
        lockedUntil: null,
        sessionVersion: {
          increment: 1,
        },
      },
    })
  })
})
