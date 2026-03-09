import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import BatchGuiaValijaClient from "./BatchGuiaValijaClient"

const { pushMock, replaceMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(""),
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock("@/components/documents/GuiaValijaReviewPanel", () => ({
  GuiaValijaReviewPanel: ({ onSaveGuia, onSaveSuccess }: any) => (
    <div>
      <button
        type="button"
        onClick={async () => {
          const result = await onSaveGuia({ azureResult: { keyValuePairs: [] }, fileName: "Guia 01.pdf", documentId: "doc-1" })
          onSaveSuccess?.(result)
        }}
      >
        Mock save
      </button>
    </div>
  ),
}))

describe("BatchGuiaValijaClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a batch and renders the queue", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "batch-1",
        status: "ready_review",
        totalFiles: 1,
        readyCount: 1,
        savedCount: 0,
        failedCount: 0,
        items: [
          {
            id: "item-1",
            sortOrder: 0,
            fileName: "Guia 01.pdf",
            filePath: "TEMP/u1/guia.pdf",
            analysisStatus: "ready_review",
            analysisResult: { content: "texto", keyValuePairs: [], tables: [], entities: [], metadata: {} },
          },
        ],
      }),
    })

    vi.stubGlobal("fetch", fetchMock)

    render(<BatchGuiaValijaClient />)

    const file = new File(["pdf"], "Guia 01.pdf", { type: "application/pdf" })
    const input = screen.getByLabelText(/seleccionar pdfs/i, { selector: "input" })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole("button", { name: /crear lote/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/guias-valija/batches",
        expect.objectContaining({ method: "POST", body: expect.any(FormData) })
      )
      expect(screen.getAllByText("Guia 01.pdf").length).toBeGreaterThan(0)
      expect(replaceMock).toHaveBeenCalledWith("/dashboard/guias-valija/lote?batchId=batch-1")
    })
  })

  it("saves the active item through the batch save endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "batch-1",
          status: "ready_review",
          totalFiles: 1,
          readyCount: 1,
          savedCount: 0,
          failedCount: 0,
          items: [
            {
              id: "item-1",
              sortOrder: 0,
              fileName: "Guia 01.pdf",
              filePath: "TEMP/u1/guia.pdf",
              analysisStatus: "ready_review",
              analysisResult: { content: "texto", keyValuePairs: [], tables: [], entities: [], metadata: {}, documentId: "doc-1" },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ guia: { id: "g-1", numeroGuia: "01-2026" } }),
      })

    vi.stubGlobal("fetch", fetchMock)

    render(<BatchGuiaValijaClient />)

    const file = new File(["pdf"], "Guia 01.pdf", { type: "application/pdf" })
    const input = screen.getByLabelText(/seleccionar pdfs/i, { selector: "input" })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole("button", { name: /crear lote/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mock save" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Mock save" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/guias-valija/batches/batch-1/items/item-1/save",
        expect.objectContaining({ method: "POST" })
      )
      expect(toastSuccessMock).toHaveBeenCalled()
    })
  })
})
