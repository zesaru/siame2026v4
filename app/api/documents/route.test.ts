import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const parseQueryMock = vi.fn()
const executeMock = vi.fn()
const toListDtoMock = vi.fn((input) => input)

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/db", () => ({ prisma: {} }))
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }))
vi.mock("@/modules/documentos/application/validation", () => ({
  parseDocumentQueryParams: parseQueryMock,
}))
vi.mock("@/modules/documentos/application/mappers", () => ({
  toDocumentsListResponseDto: toListDtoMock,
}))
vi.mock("@/modules/documentos/infrastructure", () => ({
  PrismaDocumentRepository: class {},
}))
vi.mock("@/modules/documentos/application/queries", () => ({
  ListDocumentsUseCase: class {
    execute = executeMock
  },
}))

describe("GET /api/documents", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/documents") as unknown as NextRequest
    const res = await GET(req)

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("returns 400 on invalid query params", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    parseQueryMock.mockReturnValue({
      ok: false,
      error: {
        details: [{ path: ["reviewStatus"], message: "Invalid value" }],
      },
    })

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/documents?reviewStatus=bad") as unknown as NextRequest
    const res = await GET(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toMatchObject({
      error: "Invalid query parameters",
    })
  })

  it("passes review and type filters to use case", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    parseQueryMock.mockReturnValue({
      ok: true,
      value: {
        page: 2,
        limit: 5,
        search: "abc",
        reviewStatus: "pending",
        documentType: "guia_valija",
      },
    })
    executeMock.mockResolvedValue({
      ok: true,
      value: { documents: [], total: 0 },
    })

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/documents?page=2&limit=5&reviewStatus=pending&documentType=guia_valija") as unknown as NextRequest
    const res = await GET(req)

    expect(executeMock).toHaveBeenCalledWith({
      userId: "u1",
      page: 2,
      limit: 5,
      search: "abc",
      reviewStatus: "pending",
      documentType: "guia_valija",
    })
    expect(res.status).toBe(200)
  })
})
