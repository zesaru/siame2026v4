import { findKeyValue, parseFecha, extractPeso } from "./guias-valija-parser"
import { logger } from "./logger"

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
 * Parsea una Hoja de Remisión desde el resultado de Azure Document Intelligence
 * Extrae campos específicos de keyValuePairs y contenido del documento
 */
export async function parseHojaRemisionFromAzure(
  azureResult: any
): Promise<ParsedHojaRemisionData> {
  const { content, keyValuePairs } = azureResult

  logger.separator('─', 70)
  logger.info('📋 PARSING DE HOJA DE REMISIÓN')
  logger.separator('─', 70)

  // 1. Extraer numeroCompleto y siglaUnidad de keyValuePairs
  // Buscar: "HOJA DE REMISIÓN (PCO) Nº" -> extraer "PCO" de paréntesis y el número
  let numeroCompleto = ""
  let siglaUnidad = "HH"
  let numero = 0

  // Primero buscar en keyValuePairs la clave que contiene "HOJA DE REMISIÓN"
  const hojaRemisionPair = keyValuePairs?.find((pair: any) =>
    pair.key?.content?.includes("HOJA DE REMISIÓN")
  )

  logger.info(`   🔍 Buscando par con "HOJA DE REMISIÓN"...`)
  logger.info(`   📌 Encontrado: ${hojaRemisionPair ? 'SÍ' : 'NO'}`)

  if (hojaRemisionPair) {
    logger.info(`   📋 Key: "${hojaRemisionPair.key?.content}"`)
    logger.info(`   📋 Value: "${hojaRemisionPair.value?.content}"`)
  }

  if (hojaRemisionPair?.value?.content) {
    // Extraer sigla de unidad de los paréntesis en la key
    const siglaFromKey = hojaRemisionPair.key.content.match(/\(([^)]+)\)/)
    logger.info(`   🔍 Sigla extraída: ${siglaFromKey ? siglaFromKey[1] : 'no encontrada'}`)
    if (siglaFromKey) {
      siglaUnidad = siglaFromKey[1].trim().toUpperCase()
    }

    // Extraer número del valor
    const numeroFromValue = hojaRemisionPair.value.content.match(/(\d+[^\s]*)/)
    logger.info(`   🔍 Número extraído: ${numeroFromValue ? numeroFromValue[1] : 'no encontrado'}`)
    if (numeroFromValue) {
      numeroCompleto = `HR N°${numeroFromValue[1]}`
      numero = parseInt(numeroFromValue[1].match(/(\d+)/)?.[1] || "0")
    }
  }

  // Si no se encontró en keyValuePairs, buscar en el contenido
  if (!numeroCompleto) {
    const hrMatch = content?.match(/HR\s*N[º°]\s*(\d+[^/]*)/i)
    numeroCompleto = hrMatch ? `HR N°${hrMatch[1].trim()}` : ""
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
  const documento = findKeyValue(keyValuePairs, 'DOCUMENTO')
  const asunto = findKeyValue(keyValuePairs, 'ASUNTO')
  const destino = findKeyValue(keyValuePairs, 'DESTINO')
  const pesoStr = findKeyValue(keyValuePairs, 'PESO')
  const peso = pesoStr ? extractPeso(pesoStr) : null

  // Calcular confidence scores
  const hasHojaRemisionPair = !!hojaRemisionPair
  const confidence = {
    numeroCompleto: numeroCompleto ? 0.9 : 0,
    numero: numero > 0 ? 0.9 : 0,
    siglaUnidad: hasHojaRemisionPair ? 0.8 : 0.5,
    fecha: fecha ? 0.7 : 0,
    para: para ? 0.7 : 0,
    remitente: remitente ? 0.7 : 0,
    referencia: referencia ? 0.6 : 0,
    documento: documento ? 0.6 : 0,
    asunto: asunto ? 0.6 : 0,
    destino: destino ? 0.6 : 0,
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
 */
function extractFecha(keyValuePairs: any[]): Date | null {
  const fechaStr = findKeyValue(keyValuePairs, 'FECHA') ||
                   findKeyValue(keyValuePairs, 'FECHA DE EMISION') ||
                   findKeyValue(keyValuePairs, 'FECHA DE EMISIÓN')

  if (!fechaStr) return null

  return parseFecha(fechaStr)
}
