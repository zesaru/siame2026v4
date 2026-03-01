import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const findFirstMock = vi.fn()
const updateMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }))
vi.mock("@/lib/db", () => ({
  prisma: {
    document: {
      findFirst: findFirstMock,
      update: updateMock,
    },
  },
}))

describe("POST /api/analyze/document-type/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "d1" }),
    }) as unknown as NextRequest
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("returns 404 when document is not found", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue(null)

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "d1", reason: "bad" }),
    }) as unknown as NextRequest
    const res = await POST(req)

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: "Document not found" })
  })

  it("marks document as rejected", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })
    findFirstMock.mockResolvedValue({ id: "d1", metadata: { a: 1 } })
    updateMock.mockResolvedValue({})

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "d1", reason: "Clasificación incorrecta" }),
    }) as unknown as NextRequest
    const res = await POST(req)

    expect(updateMock).toHaveBeenCalled()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      status: "rejected",
      reason: "Clasificación incorrecta",
    })
  })

  it("returns 400 when reason is missing", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } })

    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/analyze/document-type/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "d1" }),
    }) as unknown as NextRequest
    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: "reason is required" })
  })
})
