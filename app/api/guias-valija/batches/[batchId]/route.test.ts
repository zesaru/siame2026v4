import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const batchFindFirstMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/db", () => ({
  prisma: {
    guiaValijaUploadBatch: {
      findFirst: batchFindFirstMock,
    },
  },
}))

describe("GET /api/guias-valija/batches/[batchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 404 when batch does not belong to user", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    batchFindFirstMock.mockResolvedValue(null)
    const { GET } = await import("./route")

    const response = await GET(new Request("http://localhost") as unknown as NextRequest, {
      params: Promise.resolve({ batchId: "batch-1" }),
    })

    expect(response.status).toBe(404)
  })

  it("returns batch payload", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    batchFindFirstMock.mockResolvedValue({ id: "batch-1", items: [] })
    const { GET } = await import("./route")

    const response = await GET(new Request("http://localhost") as unknown as NextRequest, {
      params: Promise.resolve({ batchId: "batch-1" }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ id: "batch-1", items: [] })
  })
})
