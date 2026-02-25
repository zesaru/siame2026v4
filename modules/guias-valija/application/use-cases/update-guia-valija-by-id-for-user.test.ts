import { describe, expect, it, vi } from "vitest"
import { UpdateGuiaValijaByIdForUserUseCase } from "./update-guia-valija-by-id-for-user"
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
  fechaEmision: new Date(),
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

describe("UpdateGuiaValijaByIdForUserUseCase", () => {
  it("returns not_found when guia does not belong to user", async () => {
    const repo = createRepoMock({
      findOwnedSummaryById: vi.fn().mockResolvedValue(null),
    })
    const useCase = new UpdateGuiaValijaByIdForUserUseCase(repo)

    const result = await useCase.execute({ id: "g1", userId: "u1", data: { numeroGuia: "01-2026" } })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("not_found")
    }
  })

  it("returns duplicate_numero_guia when new numero already exists", async () => {
    const repo = createRepoMock({
      findOwnedSummaryById: vi.fn().mockResolvedValue({ id: "g1", numeroGuia: "01-2026" }),
      existsByNumeroGuia: vi.fn().mockResolvedValue(true),
    })
    const useCase = new UpdateGuiaValijaByIdForUserUseCase(repo)

    const result = await useCase.execute({ id: "g1", userId: "u1", data: { numeroGuia: "02-2026" } })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("duplicate_numero_guia")
    }
  })

  it("updates guia when numero is unchanged/valid", async () => {
    const repo = createRepoMock({
      findOwnedSummaryById: vi.fn().mockResolvedValue({ id: "g1", numeroGuia: "01-2026" }),
      updateByIdForUser: vi.fn().mockResolvedValue(guiaDetail),
    })
    const useCase = new UpdateGuiaValijaByIdForUserUseCase(repo)

    const command = { id: "g1", userId: "u1", data: { numeroGuia: "01-2026", estado: "recibido" } }
    const result = await useCase.execute(command)

    expect(repo.updateByIdForUser).toHaveBeenCalledWith(command)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe("updated")
    }
  })
})
