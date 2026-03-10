import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const authMock = vi.fn()
const findFirstMock = vi.fn()
const updateMock = vi.fn()
const saveFileMock = vi.fn()
const deleteFileMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/middleware/authorization", () => ({
  canViewAllRecords: vi.fn((role: string) => role === "ADMIN" || role === "SUPER_ADMIN"),
}))
vi.mock("@/lib/db", () => ({
  prisma: {
    guiaValija: {
      findFirst: findFirstMock,
      update: updateMock,
    },
  },
}))
vi.mock("@/lib/services/file-storage.service", () => ({
  fileStorageService: {
    saveFile: saveFileMock,
    deleteFile: deleteFileMock,
  },
}))

describe("POST /api/dashboard/guias-valija/[id]/file", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null)
    const { POST } = await import("./route")
    const req = new Request("http://localhost/api/dashboard/guias-valija/g1/file", {
      method: "POST",
      body: new FormData(),
    })

    const res = await POST(req, { params: Promise.resolve({ id: "g1" }) })

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("allows admin to upload pdf for another user's guia", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } })
    findFirstMock.mockResolvedValue({ id: "g1", filePath: "GUIAENTRADA/2026/01/old.pdf" })
    saveFileMock.mockResolvedValue({
      success: true,
      relativePath: "GUIAENTRADA/2026/03/new.pdf",
      fileHash: "hash-1",
      fileMimeType: "application/pdf",
    })
    updateMock.mockResolvedValue({ id: "g1" })
    deleteFileMock.mockResolvedValue(true)

    const file = new File(["%PDF-1.4"], "guia.pdf", { type: "application/pdf" })
    const formData = new FormData()
    formData.append("file", file)

    const { POST } = await import("./route")
    const req = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest

    const res = await POST(req, { params: Promise.resolve({ id: "g1" }) })

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "g1" },
      select: { id: true, filePath: true },
    })
    expect(saveFileMock).toHaveBeenCalled()
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: {
        filePath: "GUIAENTRADA/2026/03/new.pdf",
        fileHash: "hash-1",
        fileMimeType: "application/pdf",
      },
    })
    expect(deleteFileMock).toHaveBeenCalledWith("GUIAENTRADA/2026/01/old.pdf")
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      filePath: "GUIAENTRADA/2026/03/new.pdf",
      fileMimeType: "application/pdf",
    })
  })

  it("returns 404 when regular user targets another user's guia", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1", role: "USER" } })
    findFirstMock.mockResolvedValue(null)

    const file = new File(["%PDF-1.4"], "guia.pdf", { type: "application/pdf" })
    const formData = new FormData()
    formData.append("file", file)

    const { POST } = await import("./route")
    const req = {
      formData: vi.fn().mockResolvedValue(formData),
    } as unknown as NextRequest

    const res = await POST(req, { params: Promise.resolve({ id: "g1" }) })

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "g1", userId: "user-1" },
      select: { id: true, filePath: true },
    })
    expect(updateMock).not.toHaveBeenCalled()
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({ error: "Guía no encontrada" })
  })
})
