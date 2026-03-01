import { describe, expect, it } from "vitest"
import { transitionReviewQueueRows } from "./ReviewQueuePanel"

const baseRow = {
  id: "doc-1",
  fileName: "documento.pdf",
  fileSize: 1024,
  fileType: "application/pdf",
  fileExtension: "pdf",
  pageCount: 2,
  language: "es",
  tableCount: 0,
  keyValueCount: 0,
  entityCount: 0,
  processingStatus: "pending_review",
  reviewStatus: "pending",
  detectedDocumentType: "guia_valija",
  createdAt: "2026-02-27T00:00:00.000Z",
  analyzedAt: "2026-02-27T00:10:00.000Z",
}

describe("transitionReviewQueueRows", () => {
  it("actualiza el estado cuando el filtro es all", () => {
    const rows = [baseRow]
    const result = transitionReviewQueueRows(rows, "doc-1", "confirmed", "all")

    expect(result).toHaveLength(1)
    expect(result[0]?.reviewStatus).toBe("confirmed")
  })

  it("remueve el documento de la vista pending cuando se confirma", () => {
    const rows = [baseRow]
    const result = transitionReviewQueueRows(rows, "doc-1", "confirmed", "pending")

    expect(result).toHaveLength(0)
  })

  it("mantiene el documento visible cuando el filtro coincide con el nuevo estado", () => {
    const rows = [baseRow]
    const result = transitionReviewQueueRows(rows, "doc-1", "rejected", "rejected")

    expect(result).toHaveLength(1)
    expect(result[0]?.reviewStatus).toBe("rejected")
  })
})
