import { beforeEach, describe, expect, it, vi } from "vitest"

const authMock = vi.fn()
const findFirstMock = vi.fn()
const updateMock = vi.fn()

vi.mock("@/lib/auth-v4", () => ({ auth: authMock }))
vi.mock("@/lib/middleware/authorization", () => ({
  canViewAllRecords: vi.fn((role: string) => role === "ADMIN" || role === "SUPER_ADMIN"),
}))
vi.mock("@/lib/db", () => ({
  prisma: {
    hojaRemision: {
      findFirst: findFirstMock,
      update: updateMock,
    },
  },
}))
vi.mock("@/lib/logger", () => ({
  logger: {
    separator: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    database: vi.fn(),
    storage: vi.fn(),
  },
}))
vi.mock("@/lib/services/file-storage.service", () => ({
  fileStorageService: {
    saveFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}))
vi.mock("@/lib/pdf-upload", () => ({
  validatePdfFile: vi.fn(() => ({ ok: true })),
}))

describe("hojas-remision actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("getHojaRemision allows admin to read another user's hoja", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "SUPER_ADMIN" } })
    findFirstMock.mockResolvedValue({ id: "h1", userId: "owner-1", numeroCompleto: "HR-1" })

    const { getHojaRemision } = await import("./actions")
    const result = await getHojaRemision("h1")

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "h1" },
    })
    expect(result).toEqual({
      success: true,
      data: { id: "h1", userId: "owner-1", numeroCompleto: "HR-1" },
    })
  })

  it("updateHojaRemision allows admin to update another user's hoja", async () => {
    authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", email: "admin@test.com" } })
    findFirstMock
      .mockResolvedValueOnce({ id: "h1", userId: "owner-1", numeroCompleto: "HR-1" })
      .mockResolvedValueOnce(null)
    updateMock.mockResolvedValue({ id: "h1", numeroCompleto: "HR-1", para: "Destino" })

    const { updateHojaRemision } = await import("./actions")
    const result = await updateHojaRemision("h1", {
      numero: 1,
      numeroCompleto: "HR-1",
      siglaUnidad: "DGAD",
      fecha: "2026-03-10",
      para: "Destino",
      remitente: "Origen",
      referencia: "",
      documento: "Documento",
      asunto: "Asunto",
      destino: "Tokio",
      peso: 1.5,
      estado: "borrador",
    })

    expect(findFirstMock).toHaveBeenNthCalledWith(1, {
      where: { id: "h1" },
    })
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "h1" },
      data: expect.objectContaining({
        numeroCompleto: "HR-1",
        para: "Destino",
        processingStatus: "completed",
      }),
    })
    expect(result.success).toBe(true)
  })
})
