import { findKeyValue, parseFecha, extractPeso } from "./guias-valija-parser"
import { normalizeDescripcionEmpaque, splitHojaRemisionNumero } from "./hoja-remision-normalizer"
import { logger } from "./logger"

function normalizeTableText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
}

function isHeaderMatch(content: string | null | undefined, variants: string[]) {
  const normalized = normalizeTableText(content)
  return variants.some((variant) => normalized.includes(variant))
}

function mergeColumnContent(cells: any[], columnIndex: number, headerRowIndex: number) {
  const merged = cells
    .filter((cell: any) => cell.columnIndex === columnIndex && cell.rowIndex > headerRowIndex && cell.content?.trim())
    .sort((a: any, b: any) => {
      if (a.rowIndex !== b.rowIndex) return a.rowIndex - b.rowIndex
      return a.columnIndex - b.columnIndex
    })
    .map((cell: any) => cell.content.trim())
    .filter((value: string, index: number, source: string[]) => value && source.indexOf(value) === index)
    .join("\n")
    .trim()

  return merged || null
}

interface HojaRemisionTableMatch {
  table: any
  headerRowIndex: number
  docCol: number
  asuntoCol: number
  destCol?: number
}

function buildPositionalMatch(table: any): HojaRemisionTableMatch | null {
  if (!table?.cells || (table.columnCount || 0) < 3) return null

  const hasMeaningfulContent = table.cells.some((cell: any) => cell?.content?.trim())
  if (!hasMeaningfulContent) return null

  return {
    table,
    headerRowIndex: -1,
    docCol: 0,
    asuntoCol: 1,
    destCol: 2,
  }
}

function findMatchingTable(table: any): HojaRemisionTableMatch | null {
  if (!table?.cells) return null

  const docHeader = table.cells.find((c: any) => isHeaderMatch(c.content, ["DOCUMENTO"]))
  const asuntoHeader = table.cells.find((c: any) => isHeaderMatch(c.content, ["ASUNTO"]))
  const destHeader = table.cells.find((c: any) => isHeaderMatch(c.content, ["DESTINO", "DIRIGIDO A"]))

  if (!docHeader || !asuntoHeader) return null

  return {
    table,
    headerRowIndex: Math.min(docHeader.rowIndex, asuntoHeader.rowIndex, destHeader?.rowIndex ?? asuntoHeader.rowIndex),
    docCol: docHeader.columnIndex,
    asuntoCol: asuntoHeader.columnIndex,
    destCol: destHeader?.columnIndex,
  }
}

function hasCompatibleHeaders(base: HojaRemisionTableMatch, candidate: HojaRemisionTableMatch) {
  return (
    base.table.columnCount === candidate.table.columnCount &&
    base.docCol === candidate.docCol &&
    base.asuntoCol === candidate.asuntoCol &&
    (base.destCol ?? -1) === (candidate.destCol ?? -1)
  )
}

function mergeFieldValues(values: Array<string | null | undefined>) {
  const merged = values
    .filter(Boolean)
    .flatMap((value) => (value || "").split("\n"))
    .map((value) => value.trim())
    .filter((value, index, source) => value && source.indexOf(value) === index)
    .join("\n")
    .trim()

  return merged || null
}

function sanitizeExtractedValue(value: string | null | undefined) {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed.toLowerCase().replace(/\s+/g, "")
  if (
    normalized === ":unselected:" ||
    normalized === "unselected" ||
    normalized === ":unselected" ||
    normalized === "seleccionado" ||
    normalized === ":" ||
    normalized === "-" ||
    normalized === "--"
  ) {
    return null
  }

  return trimmed
}

function extractInlineFieldFromContent(content: string | null | undefined, labels: string[]) {
  if (!content) return null

  const lines = content
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  for (const line of lines) {
    const normalizedLine = normalizeTableText(line)

    for (const label of labels) {
      const normalizedLabel = normalizeTableText(label)
      if (!normalizedLine.startsWith(normalizedLabel)) continue

      const rawValue = line
        .replace(new RegExp(`^${label}\\s*:?[\\s]*`, "i"), "")
        .replace(/^:\s*/, "")
        .trim()

      const sanitizedValue = sanitizeExtractedValue(rawValue)
      if (sanitizedValue) return sanitizedValue
    }
  }

  return null
}

function extractLabeledSegment(
  content: string | null | undefined,
  labels: string[],
  nextLabels: string[]
) {
  if (!content) return null

  const labelPattern = labels
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .join("|")
  const nextPattern = nextLabels
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"))
    .join("|")

  const regex = new RegExp(
    `(?:^|\\n|\\s)(${labelPattern})\\s*:\\s*(.+?)(?=(?:\\s+(?:${nextPattern})\\s*:)|\\n|$)`,
    "i"
  )
  const match = content.match(regex)
  if (!match) return null

  return sanitizeExtractedValue(match[2])
}

function extractNumeroFromContent(content: string | null | undefined) {
  if (!content) {
    return { numeroCompleto: "", descripcionEmpaque: null as string | null, siglaUnidad: null as string | null }
  }

  const headerMatch = content.match(
    /HOJA\s+DE\s+REMISI(?:Ã“N|ÓN|ON)\s*\(([^)]+)\)\s*N(?:[ÂºÂ°]|º|°)\s*([^\n]+)/i
  )

  if (headerMatch) {
    const extractedParts = splitHojaRemisionNumero(`HR N\u00B0${headerMatch[2].trim()}`)
    return {
      numeroCompleto: extractedParts.numeroCompleto,
      descripcionEmpaque: extractedParts.descripcionEmpaque || null,
      siglaUnidad: headerMatch[1].trim().toUpperCase(),
    }
  }

  const hrMatch = content.match(/HR\s*N(?:[ÂºÂ°]|º|°)\s*([^\n]+)/i)
  if (!hrMatch) {
    return { numeroCompleto: "", descripcionEmpaque: null, siglaUnidad: null }
  }

  const extractedParts = splitHojaRemisionNumero(`HR N\u00B0${hrMatch[1].trim()}`)
  return {
    numeroCompleto: extractedParts.numeroCompleto,
    descripcionEmpaque: extractedParts.descripcionEmpaque || null,
    siglaUnidad: null,
  }
}

export interface ParsedHojaRemisionData {
  numeroCompleto: string
  numero: number
  siglaUnidad: string
  fecha: Date | null
  para: string | null
  remitente: string | null
  referencia: string | null
  documento: string | null
  asunto: string | null
  destino: string | null
  descripcionEmpaque: string | null
  peso: number | null
  estado?: string
  confidence: Record<string, number>
}

function extractFromTables(tables: any[]): {
  documento: string | null
  asunto: string | null
  destino: string | null
} {
  if (!tables || tables.length === 0) {
    return { documento: null, asunto: null, destino: null }
  }

  const matches = tables
    .map((table) => findMatchingTable(table))
    .filter((value): value is HojaRemisionTableMatch => Boolean(value))

  for (let index = 0; index < matches.length; index += 1) {
    const base = matches[index]
    const compatibleGroup = [base]

    for (let next = index + 1; next < matches.length; next += 1) {
      if (!hasCompatibleHeaders(base, matches[next])) break
      compatibleGroup.push(matches[next])
      index = next
    }

    const documento = mergeFieldValues(
      compatibleGroup.map((match) =>
        mergeColumnContent(match.table.cells.filter((cell: any) => cell?.content), match.docCol, match.headerRowIndex)
      )
    )
    const asunto = mergeFieldValues(
      compatibleGroup.map((match) =>
        mergeColumnContent(match.table.cells.filter((cell: any) => cell?.content), match.asuntoCol, match.headerRowIndex)
      )
    )
    const destino =
      base.destCol !== undefined
        ? mergeFieldValues(
            compatibleGroup.map((match) =>
              match.destCol !== undefined
                ? mergeColumnContent(
                    match.table.cells.filter((cell: any) => cell?.content),
                    match.destCol,
                    match.headerRowIndex
                  )
                : null
            )
          )
        : null

    if (documento || asunto) {
      if (process.env.NODE_ENV === "development") {
        console.log("\n[EXTRACT FROM TABLES]")
        console.log(`   Tablas fusionadas: ${compatibleGroup.length}`)
        console.log(`   DOCUMENTO: ${documento || "No encontrado"}`)
        console.log(`   ASUNTO: ${asunto?.substring(0, 80) || "No encontrado"}${asunto && asunto.length > 80 ? "..." : ""}`)
        console.log(`   DESTINO: ${destino || "No encontrado"}`)
      }
      return { documento, asunto, destino }
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log("\n[EXTRACT FROM TABLES] No se encontro tabla con formato esperado")
  }

  const positionalMatches = tables
    .map((table) => buildPositionalMatch(table))
    .filter((value): value is HojaRemisionTableMatch => Boolean(value))

  for (let index = 0; index < positionalMatches.length; index += 1) {
    const base = positionalMatches[index]
    const compatibleGroup = [base]

    for (let next = index + 1; next < positionalMatches.length; next += 1) {
      if (!hasCompatibleHeaders(base, positionalMatches[next])) break
      compatibleGroup.push(positionalMatches[next])
      index = next
    }

    const documento = mergeFieldValues(
      compatibleGroup.map((match) =>
        mergeColumnContent(match.table.cells.filter((cell: any) => cell?.content), match.docCol, match.headerRowIndex)
      )
    )
    const asunto = mergeFieldValues(
      compatibleGroup.map((match) =>
        mergeColumnContent(match.table.cells.filter((cell: any) => cell?.content), match.asuntoCol, match.headerRowIndex)
      )
    )
    const destino = mergeFieldValues(
      compatibleGroup.map((match) =>
        match.destCol !== undefined
          ? mergeColumnContent(match.table.cells.filter((cell: any) => cell?.content), match.destCol, match.headerRowIndex)
          : null
      )
    )

    if (documento || asunto || destino) {
      return { documento, asunto, destino }
    }
  }

  return { documento: null, asunto: null, destino: null }
}

function looksLikeInvalidDestino(value: string | null | undefined) {
  if (!value) return true

  const trimmed = value.trim()
  if (!trimmed || trimmed === "ASUNTO" || trimmed.length < 5) return true

  if (/^\d[\dA-Z\-\/\s]+$/i.test(trimmed) && !trimmed.includes(" ")) {
    return true
  }

  return false
}

export async function parseHojaRemisionFromAzure(azureResult: any): Promise<ParsedHojaRemisionData> {
  const { content, keyValuePairs, tables } = azureResult

  logger.separator("-", 70)
  logger.info("PARSING DE HOJA DE REMISION")
  logger.separator("-", 70)

  const tableData = extractFromTables(tables || [])

  let numeroCompleto = ""
  let descripcionEmpaque: string | null = null
  let siglaUnidad = "HH"
  let numero = 0

  const hojaRemisionPair = keyValuePairs?.find((pair: any) => (pair.key || "").toUpperCase().includes("HOJA DE REMISI"))

  logger.info(`   Buscando par con "HOJA DE REMISION"...`)
  logger.info(`   Encontrado: ${hojaRemisionPair ? "SI" : "NO"}`)

  if (hojaRemisionPair) {
    logger.info(`   Key: "${hojaRemisionPair.key}"`)
    logger.info(`   Value: "${hojaRemisionPair.value}"`)
  }

  if (hojaRemisionPair?.value) {
    const siglaFromKey = hojaRemisionPair.key?.match(/\(([^)]+)\)/)
    logger.info(`   Sigla extraida: ${siglaFromKey ? siglaFromKey[1] : "no encontrada"}`)
    if (siglaFromKey) {
      siglaUnidad = siglaFromKey[1].trim().toUpperCase()
    }

    const extractedParts = splitHojaRemisionNumero(`HR N\u00B0${hojaRemisionPair.value}`)
    logger.info(`   Numero extraido: ${extractedParts.numeroCompleto || "no encontrado"}`)
    if (extractedParts.numeroCompleto) {
      numeroCompleto = extractedParts.numeroCompleto
      descripcionEmpaque = extractedParts.descripcionEmpaque || null
      const firstNumber = extractedParts.numeroCompleto.match(/(\d+)/)
      numero = firstNumber ? parseInt(firstNumber[1]) : 0
    }
  }

  if (!numeroCompleto) {
    const extractedFromContent = extractNumeroFromContent(content)
    numeroCompleto = extractedFromContent.numeroCompleto
    descripcionEmpaque = extractedFromContent.descripcionEmpaque
    if (extractedFromContent.siglaUnidad) {
      siglaUnidad = extractedFromContent.siglaUnidad
    }
  }

  if (!numero) {
    const numeroMatch = numeroCompleto.match(/(\d+)/)
    numero = numeroMatch ? parseInt(numeroMatch[1]) : 0
  }

  if (!descripcionEmpaque && numeroCompleto) {
    const extractedParts = splitHojaRemisionNumero(numeroCompleto)
    descripcionEmpaque = extractedParts.descripcionEmpaque || null
  }

  const fecha = extractFecha(keyValuePairs, content)
  const para =
    sanitizeExtractedValue(findKeyValue(keyValuePairs, "PARA")) ||
    sanitizeExtractedValue(findKeyValue(keyValuePairs, "DESTINATARIO")) ||
    extractLabeledSegment(content, ["PARA", "DESTINATARIO"], ["DE LA", "REMITENTE", "FECHA", "REFERENCIA"]) ||
    extractInlineFieldFromContent(content, ["PARA", "DESTINATARIO"])
  const remitente =
    sanitizeExtractedValue(findKeyValue(keyValuePairs, "DE LA")) ||
    extractLabeledSegment(content, ["DE LA", "REMITENTE"], ["FECHA", "REFERENCIA", "DOCUMENTO", "ASUNTO", "DESTINO"]) ||
    extractInlineFieldFromContent(content, ["DE LA"]) ||
    sanitizeExtractedValue(findKeyValue(keyValuePairs, "REMITENTE")) ||
    extractInlineFieldFromContent(content, ["REMITENTE"]) ||
    sanitizeExtractedValue(findKeyValue(keyValuePairs, "DE"))
  const referencia = sanitizeExtractedValue(findKeyValue(keyValuePairs, "REFERENCIA"))
  const pesoStr = sanitizeExtractedValue(findKeyValue(keyValuePairs, "PESO"))
  const peso = pesoStr ? extractPeso(pesoStr) : null

  const documento = sanitizeExtractedValue(tableData.documento) || sanitizeExtractedValue(findKeyValue(keyValuePairs, "DOCUMENTO"))

  let asunto = sanitizeExtractedValue(tableData.asunto) || sanitizeExtractedValue(findKeyValue(keyValuePairs, "ASUNTO"))

  if (!asunto || asunto === "ASUNTO" || asunto.length < 10) {
    const asuntoMatch = content?.match(/Se remite[^.]*\./i)
    if (asuntoMatch) {
      asunto = asuntoMatch[0].trim()
    } else {
      const lines = content?.split("\n") || []
      for (const line of lines) {
        if (line.length > 50 && !line.includes("MINISTERIO") && !line.includes("DIRECCIÃ“N")) {
          asunto = line.trim()
          break
        }
      }
    }
  }

  let destino = sanitizeExtractedValue(tableData.destino) || sanitizeExtractedValue(findKeyValue(keyValuePairs, "DESTINO"))

  if (looksLikeInvalidDestino(destino)) {
    destino = para || null
  }

  if (!descripcionEmpaque) {
    descripcionEmpaque =
      normalizeDescripcionEmpaque(
        sanitizeExtractedValue(findKeyValue(keyValuePairs, "EMPAQUE")) ||
          sanitizeExtractedValue(findKeyValue(keyValuePairs, "TIPO DE EMPAQUE")) ||
          sanitizeExtractedValue(findKeyValue(keyValuePairs, "DESCRIPCION DE EMPAQUE"))
      ) || null
  }

  const hasHojaRemisionPair = !!hojaRemisionPair
  const hasTableData = !!(tableData.documento || tableData.asunto || tableData.destino)
  const confidence = {
    numeroCompleto: numeroCompleto ? 0.9 : 0,
    numero: numero > 0 ? 0.9 : 0,
    siglaUnidad: hasHojaRemisionPair || siglaUnidad !== "HH" ? 0.8 : 0.5,
    fecha: fecha ? 0.7 : 0,
    para: para ? 0.7 : 0,
    remitente: remitente ? 0.7 : 0,
    referencia: referencia ? 0.6 : 0,
    documento: documento ? (hasTableData ? 0.9 : 0.6) : 0,
    asunto: asunto ? (hasTableData ? 0.9 : 0.6) : 0,
    destino: destino ? (hasTableData ? 0.9 : 0.6) : 0,
    descripcionEmpaque: descripcionEmpaque ? 0.7 : 0,
    peso: peso ? 0.7 : 0,
  }

  logger.info("Parsing completado")
  logger.info(`   Numero Completo: ${numeroCompleto || "No detectado"}`)
  logger.info(`   Numero: ${numero || "N/A"}`)
  logger.info(`   Sigla Unidad: ${siglaUnidad}`)
  logger.info(`   Fecha: ${fecha?.toISOString().split("T")[0] || "No detectada"}`)
  logger.info(`   Para: ${para?.substring(0, 50) || "No detectado"}${(para?.length || 0) > 50 ? "..." : ""}`)
  logger.info(`   Remitente: ${remitente?.substring(0, 50) || "No detectado"}${(remitente?.length || 0) > 50 ? "..." : ""}`)
  logger.info(`   Referencia: ${referencia || "No detectado"}`)
  logger.info(`   Documento: ${documento?.substring(0, 50) || "No detectado"}${(documento?.length || 0) > 50 ? "..." : ""}`)
  logger.info(`   Asunto: ${asunto?.substring(0, 50) || "No detectado"}${(asunto?.length || 0) > 50 ? "..." : ""}`)
  logger.info(`   Destino: ${destino?.substring(0, 50) || "No detectado"}${(destino?.length || 0) > 50 ? "..." : ""}`)
  logger.info(`   Descripcion Empaque: ${descripcionEmpaque || "No detectado"}`)
  logger.info(`   Peso: ${peso || "No detectado"}`)
  logger.separator("=", 70)

  return {
    numeroCompleto,
    numero,
    siglaUnidad,
    fecha,
    para,
    remitente,
    referencia,
    documento,
    asunto,
    destino,
    descripcionEmpaque,
    peso,
    confidence,
  }
}

function extractFecha(keyValuePairs: any[], content?: string | null): Date | null {
  let fechaStr =
    sanitizeExtractedValue(findKeyValue(keyValuePairs, "FECHA")) ||
    sanitizeExtractedValue(findKeyValue(keyValuePairs, "FECHA DE EMISION")) ||
    sanitizeExtractedValue(findKeyValue(keyValuePairs, "FECHA DE EMISIÃ“N"))

  if (!fechaStr) {
    fechaStr = extractLabeledSegment(content, ["FECHA", "FECHA DE EMISION", "FECHA DE EMISIÃ“N"], [
      "REFERENCIA",
      "DOCUMENTO",
      "ASUNTO",
      "DESTINO",
    ])
  }

  if (!fechaStr) {
    fechaStr = extractInlineFieldFromContent(content, ["FECHA", "FECHA DE EMISION", "FECHA DE EMISIÃ“N"])
  }

  if (!fechaStr) return null

  fechaStr = fechaStr.replace(/^\w+,\s*/, "")

  return parseFecha(fechaStr)
}
