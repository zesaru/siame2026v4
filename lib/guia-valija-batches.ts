export const GUIA_VALIJA_BATCH_ITEM_READY_STATUSES = new Set(["ready_review"])
export const GUIA_VALIJA_BATCH_ITEM_DONE_STATUSES = new Set(["saved", "failed", "skipped"])

export interface GuiaValijaBatchCountsInput {
  analysisStatus: string
}

export interface GuiaValijaBatchSummary {
  totalFiles: number
  readyCount: number
  savedCount: number
  failedCount: number
  status: string
}

export function summarizeGuiaValijaBatch(items: GuiaValijaBatchCountsInput[]): GuiaValijaBatchSummary {
  const totalFiles = items.length
  const readyCount = items.filter((item) => item.analysisStatus === "ready_review").length
  const savedCount = items.filter((item) => item.analysisStatus === "saved").length
  const failedCount = items.filter((item) => item.analysisStatus === "failed").length

  let status = "processing"
  if (totalFiles > 0 && savedCount + failedCount === totalFiles) {
    status = "completed"
  } else if (readyCount > 0) {
    status = "ready_review"
  } else if (failedCount === totalFiles && totalFiles > 0) {
    status = "failed"
  }

  return {
    totalFiles,
    readyCount,
    savedCount,
    failedCount,
    status,
  }
}

export function isPdfFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase()
  return extension === "pdf" && (!file.type || file.type === "application/pdf")
}
