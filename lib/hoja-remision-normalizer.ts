export function normalizeHojaRemisionNumero(numeroCompleto: string | null | undefined): string {
  if (!numeroCompleto) return ""

  let normalized = numeroCompleto.trim().toUpperCase()

  normalized = normalized
    .replace(/\s+/g, " ")
    .replace(/^HR\.?\s*/, "HR ")
    .replace(/N[º°]/g, "N°")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim()

  const hrMatch = normalized.match(/^HR\s+N°\s*(.+)$/)
  if (!hrMatch) {
    return normalized
  }

  const suffix = hrMatch[1].replace(/\s+/g, "")
  return `HR N°${suffix}`
}

