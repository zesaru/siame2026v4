export const PDF_UPLOAD_MAX_SIZE_BYTES = 50 * 1024 * 1024

type PdfUploadCode =
  | "PDF_REQUIRED"
  | "PDF_EMPTY"
  | "PDF_TOO_LARGE"
  | "PDF_INVALID_TYPE"
  | "PDF_INVALID_NAME"

interface FileLike {
  name: string
  size: number
  type?: string
}

interface PdfUploadValidationResult {
  ok: boolean
  code?: PdfUploadCode
  error?: string
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validatePdfFile(file: FileLike | null | undefined): PdfUploadValidationResult {
  if (!file) {
    return { ok: false, code: "PDF_REQUIRED", error: "Selecciona un archivo PDF." }
  }

  if (!file.name || !file.name.trim()) {
    return { ok: false, code: "PDF_INVALID_NAME", error: "El archivo PDF no tiene un nombre valido." }
  }

  if (file.size <= 0) {
    return { ok: false, code: "PDF_EMPTY", error: "El archivo PDF esta vacio." }
  }

  if (file.size > PDF_UPLOAD_MAX_SIZE_BYTES) {
    return {
      ok: false,
      code: "PDF_TOO_LARGE",
      error: `El archivo supera el limite permitido de ${formatFileSize(PDF_UPLOAD_MAX_SIZE_BYTES)}.`,
    }
  }

  const lowerName = file.name.toLowerCase()
  const isPdfByName = lowerName.endsWith(".pdf")
  const isPdfByType = file.type === "application/pdf" || !file.type

  if (!isPdfByName || !isPdfByType) {
    return { ok: false, code: "PDF_INVALID_TYPE", error: "Solo se permiten archivos PDF." }
  }

  return { ok: true }
}
