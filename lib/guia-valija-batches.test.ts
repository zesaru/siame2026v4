import { describe, expect, it } from "vitest"
import { isPdfFile, summarizeGuiaValijaBatch } from "./guia-valija-batches"

describe("summarizeGuiaValijaBatch", () => {
  it("marks batch ready_review when at least one item is ready", () => {
    const summary = summarizeGuiaValijaBatch([
      { analysisStatus: "ready_review" },
      { analysisStatus: "failed" },
    ])

    expect(summary).toEqual({
      totalFiles: 2,
      readyCount: 1,
      savedCount: 0,
      failedCount: 1,
      status: "ready_review",
    })
  })

  it("marks batch completed when all items are saved or failed", () => {
    const summary = summarizeGuiaValijaBatch([
      { analysisStatus: "saved" },
      { analysisStatus: "failed" },
    ])

    expect(summary.status).toBe("completed")
    expect(summary.savedCount).toBe(1)
    expect(summary.failedCount).toBe(1)
  })
})

describe("isPdfFile", () => {
  it("accepts valid pdf files", () => {
    const file = new File(["test"], "guia.pdf", { type: "application/pdf" })
    expect(isPdfFile(file)).toBe(true)
  })

  it("rejects non-pdf files", () => {
    const file = new File(["test"], "guia.png", { type: "image/png" })
    expect(isPdfFile(file)).toBe(false)
  })
})
