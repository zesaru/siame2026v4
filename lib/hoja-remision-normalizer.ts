function normalizeHojaPrefix(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/^HR\.?\s*/, "HR ")
    .replace(/N(?:Ã‚Âº|Ã‚Â°|Âº|Â°|º|°)/g, "N\u00B0")
    .replace(/Ã‚|Â/g, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim()
}

export function normalizeDescripcionEmpaque(descripcionEmpaque: string | null | undefined): string {
  if (!descripcionEmpaque) return ""

  return descripcionEmpaque
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/([A-ZÃÃ‰ÃÃ“ÃšÃ‘])(\d)/g, "$1 $2")
    .replace(/(\d)([A-ZÃÃ‰ÃÃ“ÃšÃ‘])/g, "$1 $2")
    .replace(/\bDE(?=[A-ZÃÃ‰ÃÃ“ÃšÃ‘])/g, "DE ")
    .replace(/\bDEL(?=[A-ZÃÃ‰ÃÃ“ÃšÃ‘])/g, "DEL ")
    .replace(/\bLA(?=[A-ZÃÃ‰ÃÃ“ÃšÃ‘])/g, "LA ")
    .replace(/\bEL(?=[A-ZÃÃ‰ÃÃ“ÃšÃ‘])/g, "EL ")
    .replace(/\b(PARA|DE LA|REMITENTE|FECHA|REFERENCIA|DOCUMENTO|ASUNTO|DESTINO)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function splitHojaRemisionNumero(
  numeroCompleto: string | null | undefined
): { numeroCompleto: string; descripcionEmpaque: string } {
  if (!numeroCompleto) {
    return { numeroCompleto: "", descripcionEmpaque: "" }
  }

  const normalized = normalizeHojaPrefix(numeroCompleto)
  const hrMatch = normalized.match(/^HR\s+N\u00B0\s*(.+)$/)

  if (!hrMatch) {
    return {
      numeroCompleto: normalized,
      descripcionEmpaque: "",
    }
  }

  const compactSuffix = hrMatch[1].replace(/\s+/g, "")
  const numeroMatch = compactSuffix.match(/^(\d+(?:-\d+)*(?:-[A-Z0-9]+)*\/\d+)/)

  if (!numeroMatch) {
    return {
      numeroCompleto: `HR N\u00B0${compactSuffix}`,
      descripcionEmpaque: "",
    }
  }

  const numeroBase = numeroMatch[1]
  const rawDescripcionEmpaque = compactSuffix.slice(numeroBase.length)

  return {
    numeroCompleto: `HR N\u00B0${numeroBase}`,
    descripcionEmpaque: normalizeDescripcionEmpaque(rawDescripcionEmpaque),
  }
}

export function normalizeHojaRemisionNumero(numeroCompleto: string | null | undefined): string {
  return splitHojaRemisionNumero(numeroCompleto).numeroCompleto
}
