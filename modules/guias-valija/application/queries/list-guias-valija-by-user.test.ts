import { describe, expect, it, vi } from "vitest"
import { ListGuiasValijaByUserUseCase } from "./list-guias-valija-by-user"
import type { GuiaValijaRepository, GuiaValijaListItemRow } from "../../domain/repositories"

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

const guiaListRow: GuiaValijaListItemRow = {
  id: "g1",
  numeroGuia: "01-2026",
  fechaEmision: new Date("2026-01-01"),
  tipoValija: "ENTRADA",
  isExtraordinaria: false,
  fechaEnvio: null,
  fechaRecibo: null,
  origenCiudad: "La Paz",
  destinoCiudad: "Lima",
  origenPais: "BO",
  destinoPais: "PE",
  destinatarioNombre: "Dest",
  remitenteNombre: "Rem",
  pesoValija: 1,
  numeroPaquetes: 1,
  estado: "recibido",
  processingStatus: "completed",
  filePath: null,
  fileMimeType: null,
  userId: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [],
  precintos: [],
  _count: { items: 0, precintos: 0 },
}

describe("ListGuiasValijaByUserUseCase", () => {
  it("returns validation error when userId is missing", async () => {
    const repo = createRepoMock()
    const useCase = new ListGuiasValijaByUserUseCase(repo)

    const result = await useCase.execute({ userId: "" })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("GUIAS_USER_ID_REQUIRED")
    }
  })

  it("returns guias list for valid user", async () => {
    const repo = createRepoMock({
      listByUser: vi.fn().mockResolvedValue([guiaListRow]),
    })
    const useCase = new ListGuiasValijaByUserUseCase(repo)

    const result = await useCase.execute({ userId: "u1" })

    expect(repo.listByUser).toHaveBeenCalledWith({ userId: "u1" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0].numeroGuia).toBe("01-2026")
    }
  })

  it("wraps repository failures as application error", async () => {
    const repo = createRepoMock({
      listByUser: vi.fn().mockRejectedValue(new Error("db down")),
    })
    const useCase = new ListGuiasValijaByUserUseCase(repo)

    const result = await useCase.execute({ userId: "u1" })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("GUIAS_FETCH_FAILED")
    }
  })
})
