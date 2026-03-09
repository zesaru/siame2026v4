import { describe, expect, it, vi, beforeEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { GuiaValijaReviewPanel } from "./GuiaValijaReviewPanel"

vi.mock("@/components/GuiaValijaForm", () => ({
  default: () => <div data-testid="guia-valija-form">Guia form</div>,
}))

const baseResult = {
  content: "contenido de prueba",
  tables: [],
  keyValuePairs: [{ key: "PARA", value: "LEPRU TOKIO", confidence: 0.9 }],
  entities: [],
  metadata: { title: "Guia 01.pdf" },
}

describe("GuiaValijaReviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls onSaveGuia with the reviewed payload", async () => {
    const onSaveGuia = vi.fn().mockResolvedValue({ guia: { numeroGuia: "01-2026" } })
    const onSaveSuccess = vi.fn()

    render(
      <GuiaValijaReviewPanel
        result={baseResult}
        fileName="Guia 01.pdf"
        fileUrl="blob:test"
        documentId="doc-1"
        onSaveGuia={onSaveGuia}
        onSaveSuccess={onSaveSuccess}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /guardar como guía de valija/i }))

    await waitFor(() => {
      expect(onSaveGuia).toHaveBeenCalledWith({
        azureResult: expect.objectContaining({
          content: "contenido de prueba",
          keyValuePairs: [{ key: "PARA", value: "LEPRU TOKIO", confidence: 0.9 }],
          tables: [],
        }),
        fileName: "Guia 01.pdf",
        documentId: "doc-1",
      })
      expect(onSaveSuccess).toHaveBeenCalledWith({ guia: { numeroGuia: "01-2026" } })
      expect(screen.getByText(/guía de valija guardada exitosamente/i)).toBeInTheDocument()
    })
  })

  it("renders save errors returned by onSaveGuia", async () => {
    const onSaveGuia = vi.fn().mockResolvedValue({ error: "No se pudo guardar la guía" })
    const onSaveError = vi.fn()

    render(
      <GuiaValijaReviewPanel
        result={baseResult}
        fileName="Guia 01.pdf"
        fileUrl="blob:test"
        onSaveGuia={onSaveGuia}
        onSaveError={onSaveError}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /guardar como guía de valija/i }))

    await waitFor(() => {
      expect(screen.getByText("No se pudo guardar la guía")).toBeInTheDocument()
      expect(onSaveError).toHaveBeenCalledWith("No se pudo guardar la guía")
    })
  })
})
