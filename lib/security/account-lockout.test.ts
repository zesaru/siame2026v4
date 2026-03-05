import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}

const bcryptMock = {
  compare: vi.fn(),
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

vi.mock("bcryptjs", () => ({
  default: bcryptMock,
}))

describe("account-lockout", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.AUTH_ACCOUNT_LOCK_THRESHOLD
    delete process.env.AUTH_ACCOUNT_LOCK_MINUTES
  })

  it("returns locked when user is currently locked", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        id: "u1",
        name: "A",
        email: "a@b.com",
        role: "USER",
        password: "hash",
        failedLoginCount: 5,
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000),
      },
    ])

    const { authenticateWithLockout } = await import("./account-lockout")
    const result = await authenticateWithLockout("a@b.com", "x")
    expect(result.status).toBe("locked")
  })

  it("resets counters on successful login", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        id: "u1",
        name: "A",
        email: "a@b.com",
        role: "USER",
        password: "hash",
        failedLoginCount: 2,
        lockedUntil: null,
      },
    ])
    bcryptMock.compare.mockResolvedValueOnce(true)
    prismaMock.$executeRaw.mockResolvedValueOnce(1)

    const { authenticateWithLockout } = await import("./account-lockout")
    const result = await authenticateWithLockout("a@b.com", "ok")
    expect(result.status).toBe("success")
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1)
  })

  it("locks account when threshold is reached", async () => {
    process.env.AUTH_ACCOUNT_LOCK_THRESHOLD = "3"
    process.env.AUTH_ACCOUNT_LOCK_MINUTES = "15"

    prismaMock.$queryRaw.mockResolvedValueOnce([
      {
        id: "u1",
        name: "A",
        email: "a@b.com",
        role: "USER",
        password: "hash",
        failedLoginCount: 2,
        lockedUntil: null,
      },
    ])
    bcryptMock.compare.mockResolvedValueOnce(false)
    prismaMock.$executeRaw.mockResolvedValueOnce(1)

    const { authenticateWithLockout } = await import("./account-lockout")
    const result = await authenticateWithLockout("a@b.com", "bad")
    expect(result.status).toBe("locked")
  })
})
