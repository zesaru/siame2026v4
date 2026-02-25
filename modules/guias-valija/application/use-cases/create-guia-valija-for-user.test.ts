import { describe, expect, it, vi } from "vitest"
import { CreateGuiaValijaForUserUseCase } from "./create-guia-valija-for-user"
import type { GuiaValijaDetailRow, GuiaValijaRepository } from "../../domain/repositories"

function createRepoMock(overrides?: Partial<GuiaValijaRepository>): GuiaValijaRepository {
  return {
    listByUser: vi.fn(),
    findByIdForUser: vi.fn(),
    deleteByIdForUser: vi.fn(),
    findOwnedSummaryById: vi.fn(),
    existsByNumeroGuia: vi.fn(),
    updateByIdForUser: vi.fn(),
    createForUser: vi.fn(),
    ...overrides,
  } as unknown as GuiaValijaRepository
}

const guiaDetail: GuiaValijaDetailRow = {
  id: "g1",
  numeroGuia: "01-2026",
  userId: "u1",
  tipoValija: "ENTRADA",
  fechaEmision: new Date("2026-01-01"),
  fechaEnvio: null,
  fechaRecibo: null,
  origenCiudad: null,
  destinoCiudad: null,
  origenPais: null,
  destinoPais: null,
  remitenteNombre: null,
  remitenteCargo: null,
  remitenteEmail: null,
  destinatarioNombre: null,
  destinatarioCargo: null,
  destinatarioEmail: null,
  pesoValija: null,
  pesoOficial: null,
  numeroPaquetes: null,
  descripcionContenido: null,
  observaciones: null,
  preparadoPor: null,
  revisadoPor: null,
  firmaReceptor: null,
  estado: "pendiente",
  processingStatus: "completed",
  filePath: null,
  fileMimeType: null,
  isExtraordinaria: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
  precintos: [],
}

describe("CreateGuiaValijaForUserUseCase", () => {
  it("returns validation error when required fields are missing", async () => {
    const useCase = new CreateGuiaValijaForUserUseCase(createRepoMock())

    const result = await useCase.execute({ userId: "", data: { numeroGuia: "" } })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("GUIA_REQUIRED_FIELDS")
    }
  })

  it("returns duplicate status when numeroGuia already exists", async () => {
    const repo = createRepoMock({
      existsByNumeroGuia: vi.fn().mockResolvedValue(true),
    })
    const useCase = new CreateGuiaValijaForUserUseCase(repo)

    const result = await useCase.execute({ userId: "u1", data: { numeroGuia: "01-2026" } })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("duplicate_numero_guia")
    }
    expect(repo.createForUser).not.toHaveBeenCalled()
  })

  it("creates guia when numeroGuia is unique", async () => {
    const repo = createRepoMock({
      existsByNumeroGuia: vi.fn().mockResolvedValue(false),
      createForUser: vi.fn().mockResolvedValue(guiaDetail),
    })
    const useCase = new CreateGuiaValijaForUserUseCase(repo)

    const command = { userId: "u1", data: { numeroGuia: "01-2026" } }
    const result = await useCase.execute(command)

    expect(repo.existsByNumeroGuia).toHaveBeenCalledWith({ numeroGuia: "01-2026" })
    expect(repo.createForUser).toHaveBeenCalledWith(command)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("created")
      if (result.value.status === "created") {
        expect(result.value.guia.id).toBe("g1")
      }
    }
  })
})
