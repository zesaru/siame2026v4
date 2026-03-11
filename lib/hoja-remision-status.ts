export const HOJA_REMISION_STATUS = {
  PENDING_REVIEW: "SIN REVISAR",
  REVIEWED: "REVISADA",
} as const

export type HojaRemisionStatus =
  (typeof HOJA_REMISION_STATUS)[keyof typeof HOJA_REMISION_STATUS]

export function normalizeHojaRemisionEstado(value?: string | null): HojaRemisionStatus {
  const normalized = value?.trim().toLowerCase()

  switch (normalized) {
    case "revisada":
    case "recibida":
      return HOJA_REMISION_STATUS.REVIEWED
    case "sin revisar":
    case "borrador":
    case "enviada":
    case "anulada":
    default:
      return HOJA_REMISION_STATUS.PENDING_REVIEW
  }
}

