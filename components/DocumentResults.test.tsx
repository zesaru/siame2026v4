import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

const { pushMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock("@/components/GuiaValijaForm", () => ({
  default: () => <div data-testid="guia-valija-form">Guia form</div>,
}))

import DocumentResults from "./DocumentResults"

const baseResult = {
  content: "contenido de prueba",
  tables: [],
  keyValuePairs: [{ key: "PARA", value: "LEPRU TOKIO", confidence: 0.9 }],
  entities: [],
  metadata: { title: "Guia 01.pdf" },
}

describe("DocumentResults", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("keeps the single-file save flow working", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        guia: { numeroGuia: "01-2026" },
      }),
    })

    vi.stubGlobal("fetch", fetchMock)

    render(<DocumentResults result={baseResult} fileName="Guia 01.pdf" fileUrl="blob:test" documentId="doc-1" />)

    fireEvent.click(screen.getByRole("button", { name: /guardar como guía de valija/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/guias-valija/procesar",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      )
      expect(toastSuccessMock).toHaveBeenCalledWith("Guía de valija guardada exitosamente. Nº: 01-2026")
      expect(pushMock).toHaveBeenCalledWith("/dashboard/guias-valija")
      expect(toastErrorMock).not.toHaveBeenCalled()
    })
  })
})
