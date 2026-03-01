import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const getServerSessionMock = vi.fn()
const logDocumentViewMock = vi.fn(() => Promise.resolve())
const executeMock = vi.fn()

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))
vi.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}))
vi.mock("@/lib/db", () => ({ prisma: {} }))
vi.mock("@/lib/services/file-audit.service", () => ({
  logDocumentView: logDocumentViewMock,
  extractIpAddress: vi.fn(() => "127.0.0.1"),
  extractUserAgent: vi.fn(() => "vitest"),
}))
vi.mock("@/modules/hojas-remision/infrastructure", () => ({
  PrismaHojaRemisionRepository: class {},
}))
vi.mock("@/modules/hojas-remision/application/mappers", () => ({
  toHojaRemisionDto: (x: any) => x,
}))
vi.mock("@/modules/hojas-remision/application/queries", () => ({
  GetHojaRemisionByIdForUserUseCase: class {
    execute = executeMock
  },
}))
vi.mock("@/modules/hojas-remision/application/use-cases", () => ({
  DeleteHojaRemisionUseCase: class {},
  UpdateHojaRemisionUseCase: class {},
}))
vi.mock("@/modules/hojas-remision/application/validation", () => ({
  parseUpdateHojaRemisionCommand: vi.fn(),
}))

describe("GET /api/hojas-remision/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("logs VIEW by default", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    executeMock.mockResolvedValue({
      ok: true,
      value: {
        id: "h1",
        numeroCompleto: "HR-1",
      },
    })

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/hojas-remision/h1") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "h1" }) })

    expect(res.status).toBe(200)
    expect(logDocumentViewMock).toHaveBeenCalled()
  })

  it("skips VIEW log when trackView=0", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    executeMock.mockResolvedValue({
      ok: true,
      value: {
        id: "h1",
        numeroCompleto: "HR-1",
      },
    })

    const { GET } = await import("./route")
    const req = new Request("http://localhost/api/hojas-remision/h1?trackView=0") as unknown as NextRequest
    const res = await GET(req, { params: Promise.resolve({ id: "h1" }) })

    expect(res.status).toBe(200)
    expect(logDocumentViewMock).not.toHaveBeenCalled()
  })
})
