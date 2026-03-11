import { findKeyValue, parseFecha, extractPeso } from "./guias-valija-parser"
import { normalizeHojaRemisionNumero } from "./hoja-remision-normalizer"
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

/**
 * Resultado del parsing de una Hoja de Remisión
 */
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
  peso: number | null
  confidence: Record<string, number>
}

/**
 * Extrae campos de tablas (DOCUMENTO, ASUNTO, DESTINO)
 * Busca en TODAS las tablas, no solo la primera
 * Maneja documentos de múltiples páginas
 */
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
    const destino = base.destCol !== undefined
      ? mergeFieldValues(
          compatibleGroup.map((match) =>
            match.destCol !== undefined
              ? mergeColumnContent(match.table.cells.filter((cell: any) => cell?.content), match.destCol, match.headerRowIndex)
              : null
          )
        )
      : null

    if (documento || asunto) {
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📋 [EXTRACT FROM TABLES]')
        console.log(`   Tablas fusionadas: ${compatibleGroup.length}`)
        console.log(`   DOCUMENTO: ${documento || 'No encontrado'}`)
        console.log(`   ASUNTO: ${asunto?.substring(0, 80) || 'No encontrado'}${asunto && asunto.length > 80 ? '...' : ''}`)
        console.log(`   DESTINO: ${destino || 'No encontrado'}`)
      }
      return { documento, asunto, destino }
    }
  }

  // Si no se encontró en ninguna tabla con el formato esperado
  if (process.env.NODE_ENV === 'development') {
    console.log('\n⚠️ [EXTRACT FROM TABLES] No se encontró tabla con formato esperado')
  }
  return { documento: null, asunto: null, destino: null }
}

function looksLikeInvalidDestino(value: string | null | undefined) {
  if (!value) return true

  const trimmed = value.trim()
  if (!trimmed || trimmed === "ASUNTO" || trimmed.length < 5) return true

  // Evita valores que en realidad parecen número de HR/referencia
  if (/^\d[\dA-Z\-\/\s]+$/i.test(trimmed) && !trimmed.includes(" ")) {
    return true
  }

  return false
}

/**
 * Parsea una Hoja de Remisión desde el resultado de Azure Document Intelligence
 * Extrae campos específicos de keyValuePairs y contenido del documento
 */
export async function parseHojaRemisionFromAzure(
  azureResult: any
): Promise<ParsedHojaRemisionData> {
  const { content, keyValuePairs, tables } = azureResult

  logger.separator('─', 70)
  logger.info('📋 PARSING DE HOJA DE REMISIÓN')
  logger.separator('─', 70)

  // 0. Extraer campos de la tabla (DOCUMENTO, ASUNTO, DESTINO)
  const tableData = extractFromTables(tables || [])

  // 1. Extraer numeroCompleto y siglaUnidad de keyValuePairs
  // Buscar: "HOJA DE REMISIÓN (PCO) Nº" -> extraer "PCO" de paréntesis y el número
  let numeroCompleto = ""
  let siglaUnidad = "HH"
  let numero = 0

  // Primero buscar en keyValuePairs la clave que contiene "HOJA DE REMISIÓN"
  // keyValuePairs tiene estructura: { key: string, value: string, confidence: number }
  const hojaRemisionPair = keyValuePairs?.find((pair: any) =>
    pair.key?.includes("HOJA DE REMISIÓN")
  )

  logger.info(`   🔍 Buscando par con "HOJA DE REMISIÓN"...`)
  logger.info(`   📌 Encontrado: ${hojaRemisionPair ? 'SÍ' : 'NO'}`)

  if (hojaRemisionPair) {
    logger.info(`   📋 Key: "${hojaRemisionPair.key}"`)
    logger.info(`   📋 Value: "${hojaRemisionPair.value}"`)
  }

  if (hojaRemisionPair?.value) {
    // Extraer sigla de unidad de los paréntesis en la key
    // key es un string, ej: "HOJA DE REMISIÓN (DAO) Nº"
    const siglaFromKey = hojaRemisionPair.key?.match(/\(([^)]+)\)/)
    logger.info(`   🔍 Sigla extraída: ${siglaFromKey ? siglaFromKey[1] : 'no encontrada'}`)
    if (siglaFromKey) {
      siglaUnidad = siglaFromKey[1].trim().toUpperCase()
    }

    // Extraer número del valor - MEJORADO: Capturar formatos como "5-18-A/37"
    // Regex mejorado: captura números con guiones, letras, barra, espacios
    const numeroFromValue = hojaRemisionPair.value.match(/([\d\-]+[A-Za-z]?\s*\/?\s*[\d\-]+)/)
    logger.info(`   🔍 Número extraído: ${numeroFromValue ? numeroFromValue[1] : 'no encontrado'}`)
    if (numeroFromValue) {
      // Limpiar espacios extras
      const cleanedNumero = numeroFromValue[1].replace(/\s+/g, '')
      numeroCompleto = normalizeHojaRemisionNumero(`HR N°${cleanedNumero}`)
      // Extraer el primer número para el campo numero
      const firstNumber = cleanedNumero.match(/(\d+)/)
      numero = firstNumber ? parseInt(firstNumber[1]) : 0
    }
  }

  // Si no se encontró en keyValuePairs, buscar en el contenido
  if (!numeroCompleto) {
    const hrMatch = content?.match(/HR\s*N[º°]\s*(\d+[^/]*)/i)
    numeroCompleto = hrMatch ? normalizeHojaRemisionNumero(`HR N°${hrMatch[1].trim()}`) : ""
  }

  if (!numero) {
    const numeroMatch = numeroCompleto.match(/(\d+)/)
    numero = numeroMatch ? parseInt(numeroMatch[1]) : 0
  }

  // 2. Extraer campos de keyValuePairs
  const fecha = extractFecha(keyValuePairs)
  const para = findKeyValue(keyValuePairs, 'PARA') ||
               findKeyValue(keyValuePairs, 'DESTINATARIO')
  const remitente = findKeyValue(keyValuePairs, 'DE LA') ||
                    findKeyValue(keyValuePairs, 'DE') ||
                    findKeyValue(keyValuePairs, 'REMITENTE')
  const referencia = findKeyValue(keyValuePairs, 'REFERENCIA')
  const pesoStr = findKeyValue(keyValuePairs, 'PESO')
  const peso = pesoStr ? extractPeso(pesoStr) : null

  // 3. Priorizar datos de tabla sobre keyValuePairs
  const documento = tableData.documento || findKeyValue(keyValuePairs, 'DOCUMENTO')

  // Para ASUNTO: primero intentar tabla, luego buscar en keyValuePairs,
  // y finalmente extraer del content si no se encontró
  let asunto = tableData.asunto || findKeyValue(keyValuePairs, 'ASUNTO')

  // Si el asunto es "ASUNTO" (error de Azure), buscar en el contenido
  if (!asunto || asunto === 'ASUNTO' || asunto.length < 10) {
    // Buscar en el contenido el texto que describe los items
    // Generalmente comienza con "Se remite" o similar
    const asuntoMatch = content?.match(/Se remite[^.]*\./i)
    if (asuntoMatch) {
      asunto = asuntoMatch[0].trim()
    } else {
      // Si no, buscar el primer texto largo después de "DOCUMENTO" en el contenido
      const lines = content?.split('\n') || []
      for (const line of lines) {
        if (line.length > 50 && !line.includes('MINISTERIO') && !line.includes('DIRECCIÓN')) {
          asunto = line.trim()
          break
        }
      }
    }
  }

  // Para DESTINO: usar "PARA" o buscar clave válida (ignorar el error DESTINO=ASUNTO)
  let destino = tableData.destino || findKeyValue(keyValuePairs, 'DESTINO')

  // Si el destino es inválido o parece un número/referencia, usar "PARA" como fallback
  if (looksLikeInvalidDestino(destino)) {
    destino = para || null
  }

  // Calcular confidence scores
  const hasHojaRemisionPair = !!hojaRemisionPair
  const hasTableData = !!(tableData.documento || tableData.asunto || tableData.destino)
  const confidence = {
    numeroCompleto: numeroCompleto ? 0.9 : 0,
    numero: numero > 0 ? 0.9 : 0,
    siglaUnidad: hasHojaRemisionPair ? 0.8 : 0.5,
    fecha: fecha ? 0.7 : 0,
    para: para ? 0.7 : 0,
    remitente: remitente ? 0.7 : 0,
    referencia: referencia ? 0.6 : 0,
    documento: documento ? (hasTableData ? 0.9 : 0.6) : 0,
    asunto: asunto ? (hasTableData ? 0.9 : 0.6) : 0,
    destino: destino ? (hasTableData ? 0.9 : 0.6) : 0,
    peso: peso ? 0.7 : 0,
  }

  // Log de resultados
  logger.info(`✅ Parsing completado`)
  logger.info(`   Número Completo: ${numeroCompleto || 'No detectado'}`)
  logger.info(`   Número: ${numero || 'N/A'}`)
  logger.info(`   Sigla Unidad: ${siglaUnidad}`)
  logger.info(`   Fecha: ${fecha?.toISOString().split('T')[0] || 'No detectada'}`)
  logger.info(`   Para: ${para?.substring(0, 50) || 'No detectado'}${para?.length > 50 ? '...' : ''}`)
  logger.info(`   Remitente: ${remitente?.substring(0, 50) || 'No detectado'}${remitente?.length > 50 ? '...' : ''}`)
  logger.info(`   Referencia: ${referencia || 'No detectado'}`)
  logger.info(`   Documento: ${documento?.substring(0, 50) || 'No detectado'}${documento?.length > 50 ? '...' : ''}`)
  logger.info(`   Asunto: ${asunto?.substring(0, 50) || 'No detectado'}${asunto?.length > 50 ? '...' : ''}`)
  logger.info(`   Destino: ${destino?.substring(0, 50) || 'No detectado'}${destino?.length > 50 ? '...' : ''}`)
  logger.info(`   Peso: ${peso || 'No detectado'}`)
  logger.separator('═', 70)

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
    peso,
    confidence,
  }
}

/**
 * Extrae la fecha de los keyValuePairs
 * Busca variantes: FECHA, FECHA DE EMISION, FECHA DE EMISIÓN
 * Maneja formato: "Lima, 5 de Septiembre del 2025" (elimina ciudad al inicio)
 */
function extractFecha(keyValuePairs: any[]): Date | null {
  let fechaStr = findKeyValue(keyValuePairs, 'FECHA') ||
                 findKeyValue(keyValuePairs, 'FECHA DE EMISION') ||
                 findKeyValue(keyValuePairs, 'FECHA DE EMISIÓN')

  if (!fechaStr) return null

  // Eliminar ciudad al inicio si existe: "Lima, " o "Cusco, "
  // Patrón: palabra seguida de coma y espacio al inicio del string
  fechaStr = fechaStr.replace(/^\w+,\s*/, '')

  return parseFecha(fechaStr)
}
