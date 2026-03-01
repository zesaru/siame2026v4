import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const findFirstMock = vi.fn()
const logDocumentViewMock = vi.fn(() => Promise.resolve())

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/db", () => ({
  prisma: {
    guiaValija: {
      findFirst: findFirstMock,
      delete: vi.fn(),
    },
  },
}))
vi.mock("@/lib/services/file-audit.service", () => ({
  logDocumentView: logDocumentViewMock,
  extractIpAddress: vi.fn(() => "127.0.0.1"),
  extractUserAgent: vi.fn(() => "vitest"),
}))

describe("GET /api/guias-valija/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("logs VIEW by default", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "g1",
      numeroGuia: "GV-1",
      items: [],
      precintos: [],
    })

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/guias-valija/g1") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "g1" }) })

    expect(res.status).toBe(200)
    expect(logDocumentViewMock).toHaveBeenCalled()
  })

  it("skips VIEW log when trackView=0", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({
      id: "g1",
      numeroGuia: "GV-1",
      items: [],
      precintos: [],
    })

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/guias-valija/g1?trackView=0") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "g1" }) })

    expect(res.status).toBe(200)
    expect(logDocumentViewMock).not.toHaveBeenCalled()
  })
})
