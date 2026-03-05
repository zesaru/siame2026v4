import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("session-revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns null when user session version does not exist", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([])
    const { getUserSessionVersion } = await import("./session-revocation")

    const result = await getUserSessionVersion("user-1")
    expect(result).toBeNull()
  })

  it("increments and returns updated session version", async () => {
    prismaMock.$executeRaw
      .mockResolvedValueOnce(1) // User sessionVersion increment
      .mockResolvedValueOnce(2) // AuthSession revoke
    prismaMock.$queryRaw.mockResolvedValueOnce([{ sessionVersion: 3 }])
    const { revokeUserSessionsByUserId } = await import("./session-revocation")

    const result = await revokeUserSessionsByUserId("user-1")

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(2)
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1)
    expect(result).toBe(3)
  })
})
