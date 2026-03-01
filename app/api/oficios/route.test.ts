import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const findManyMock = vi.fn()
const countMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }))
vi.mock("@/lib/db", () => ({
  prisma: {
    oficio: {
      findMany: findManyMock,
      count: countMock,
    },
  },
}))

describe("GET /api/oficios", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/oficios") as unknown as NextRequest
    const res = await GET(req)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("applies pagination and search filters", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findManyMock.mockResolvedValue([])
    countMock.mockResolvedValue(0)

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/oficios?page=2&limit=10&search=of-123") as unknown as NextRequest
    const res = await GET(req)

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        where: expect.objectContaining({
          userId: "u1",
          OR: expect.any(Array),
        }),
      })
    )
    expect(countMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u1",
          OR: expect.any(Array),
        }),
      })
    )
    expect(res.status).toBe(200)
  })
})
