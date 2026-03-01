import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import OficioViewClient from "./OficioViewClient"

const { toastErrorMock } = vi.hoisted(() => ({
  toastErrorMock: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}))

describe("OficioViewClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders oficio details when API returns data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "of-1",
        numeroOficio: "OF-100",
        asunto: "Asunto de prueba",
        remitente: "Remitente Test",
        destinatario: "Destino Test",
        referencia: "REF-1",
        sourceDocumentId: "doc-1",
        createdAt: "2026-03-01T00:00:00.000Z",
      }),
    })

    vi.stubGlobal("fetch", fetchMock)
    render(<OficioViewClient oficioId="of-1" />)

    await waitFor(() => {
      expect(screen.getByText("Oficio Confirmado")).toBeInTheDocument()
      expect(screen.getByText("OF-100")).toBeInTheDocument()
      expect(screen.getByText("Asunto de prueba")).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalledWith("/api/oficios/of-1?trackView=1", expect.any(Object))
  })

  it("renders not found state when API returns 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Oficio no encontrado" }),
    })

    vi.stubGlobal("fetch", fetchMock)
    render(<OficioViewClient oficioId="of-missing" />)

    await waitFor(() => {
      expect(screen.getByText("Oficio no encontrado")).toBeInTheDocument()
      expect(screen.getByText("Volver al listado")).toBeInTheDocument()
    })
  })

  it("shows toast error and fallback when API returns 500", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Fallo interno" }),
    })

    vi.stubGlobal("fetch", fetchMock)
    render(<OficioViewClient oficioId="of-err" />)

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Fallo interno")
      expect(screen.getByText("Oficio no encontrado")).toBeInTheDocument()
    })
  })
})
