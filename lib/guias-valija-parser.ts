import { prisma } from "./db"
import { logger } from "./logger"
import { fileStorageService } from "./services/file-storage.service"

/**
 * Extrae solo el número de guía del remitente cuando contiene el formato completo
 * Ej: "UNIDAD DE VALIJA DIPLOMÁTICA GUÍA DE VALIJA DIPLOMÁTICA Nº02." -> "02"
 * Si no tiene el formato, retorna el texto original
 */
export function extractNumeroFromRemitente(remitente: string): string {
  if (!remitente) return remitente

  // Buscar patrón: GUÍA DE VALIJA DIPLOMÁTICA NºXX
  const match = remitente.match(/GU[ÍÍ]A\s+DE\s+VALIJA\s+DIPLOM[ÁA]TICA\s+N[º°]\s*(\d+)/i)
  if (match && match[1]) {
    return match[1]
  }

  // Si no tiene el formato, retornar original
  return remitente
}

/**
 * Extrae el número de guía de un texto
 * Ej: "GUÍA DE VALIJA DIPLOMÁTICA N°07." -> "07"
 * También busca: "GUÍA AÉREA Nº 0003014"
 */
export function extractNumeroGuia(text: string): string {
  if (!text) return ""

  // Limpiar saltos de línea múltiples y espacios excesivos
  const cleanText = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim()

  // Buscar patrones como:
  // - "GUÍA DE VALIJA DIPLOMÁTICA N°07."
  // - "GUÍA AÉREA Nº 0003014"
  // - "N°07" o "Nº 07"

  // Primero buscar "GUÍA DE VALIJA DIPLOMÁTICA EXTRAORDINARIA N°04" (o variantes)
  const guiaExtraordinariaMatch = cleanText.match(
    /GU[ÍI]A\s+DE\s+VALIJA\s+DIPLOM[ÁA]TICA(?:\s+EXTRAORDINARIA)?\s+N(?:[º°]|o\.?)?\s*(\d{1,4})/i
  )
  if (guiaExtraordinariaMatch && guiaExtraordinariaMatch[1]) {
    return guiaExtraordinariaMatch[1]
  }

  // Buscar "GUÍA DE VALIJA DIPLOMÁTICA N°" o similar
  const guiaDiplomaticaMatch = cleanText.match(/GU[ÍI]A\s+DE\s+VALIJA\s+DIPLOM[ÁA]TICA\s+N(?:[º°]|o\.?)?\s*(\d{1,4})/i)
  if (guiaDiplomaticaMatch && guiaDiplomaticaMatch[1]) {
    return guiaDiplomaticaMatch[1]
  }

  // Buscar "GUÍA AÉREA Nº"
  const guiaAereaMatch = cleanText.match(/GU[ÍÍ]A\s+A[ÉE]REA\s+N[º°]\s*(\d+)/i)
  if (guiaAereaMatch && guiaAereaMatch[1]) {
    return guiaAereaMatch[1]
  }

  // Buscar patrones generales: Nº02, No 02, #02, etc.
  const match = cleanText.match(/N[º°]\s*(\d+)|NO\s*[:.]?\s*(\d+)|#\s*(\d+)/i)
  if (match) {
    return match[1] || match[2] || match[3] || ""
  }

  // Si no encuentra nada, retornar string vacío
  return ""
}

/**
 * Parsea fecha en diferentes formatos:
 * - DD/MM/YYYY
 * - D de MMMM del YYYY (ej: "5 de Septiembre del 2025")
 */
export function parseFecha(fechaStr: string): Date | null {
  if (!fechaStr) return null

  // Limpiar caracteres problemáticos que puede incluir Azure OCR
  // Ejemplo: "19(/12/2025" -> "19/12/2025"
  const cleanedFechaStr = fechaStr
    .replace(/[()[\]{}]/g, '') // Eliminar paréntesis, corchetes, llaves
    .replace(/\s+/g, '')        // Eliminar espacios extras
    .trim()

  // Formato DD/MM/YYYY
  const matchSlash = cleanedFechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (matchSlash) {
    const [, day, month, year] = matchSlash
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    // Validar que la fecha sea correcta
    if (isNaN(date.getTime())) {
      return null
    }
    return date
  }

  // Formato "D de MMMM del YYYY" o "DD de MMMM del YYYY"
  // Ejemplo: "5 de Septiembre del 2025"
  const matchText = fechaStr.match(/(\d{1,2})\s+de\s+(\w+)\s+del\s+(\d{4})/i)
  if (matchText) {
    const [, day, monthStr, year] = matchText

    // Mapeo de meses en español a inglés (para Date constructor)
    const meses: Record<string, number> = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'setiembre': 8, 'octubre': 9,
      'noviembre': 10, 'diciembre': 11
    }

    const month = meses[monthStr.toLowerCase()]
    if (month !== undefined) {
      const date = new Date(parseInt(year), month, parseInt(day))
      // Validar que la fecha sea correcta
      if (isNaN(date.getTime())) {
        return null
      }
      return date
    }
  }

  // Intentar parseo directo (como fallback)
  const date = new Date(fechaStr)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Extrae peso numérico de un string
 * Formato peruano: punto como separador decimal (ej: "0.930", "63.810")
 * También soporta formato con coma decimal (ej: "0,930" -> 0.930)
 */
export function extractPeso(pesoStr: string): number | null {
  if (!pesoStr) return null

  // Limpiar espacios
  const cleaned = pesoStr.trim()

  // Buscar el último separador (punto o coma) - asumimos que es el decimal
  const lastDotIndex = cleaned.lastIndexOf('.')
  const lastCommaIndex = cleaned.lastIndexOf(',')

  let numberStr = cleaned

  if (lastDotIndex > lastCommaIndex) {
    // El punto es el separador decimal (formato peruano: 0.930)
    // Eliminar solo las comas (separadores de miles)
    numberStr = cleaned.replace(/,/g, '')
  } else if (lastCommaIndex > lastDotIndex) {
    // La coma es el separador decimal (formato europeo: 0,930)
    // Eliminar puntos (separadores de miles) y convertir coma a punto
    numberStr = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    // No tiene separadores decimales, eliminar ambos
    numberStr = cleaned.replace(/[.,]/g, '')
  }

  // Extraer solo la parte numérica con posible decimal
  const match = numberStr.match(/(\d+\.?\d*)/)
  if (match) {
    return parseFloat(match[1])
  }

  return null
}

/**
 * Extrae numeroCompleto de un contenido que empieza con "HR Nº"
 * Ej: "HR Nº5-18-A/ 3 CAJA" -> {
 *   numeroCompleto: "HR Nº5-18-A/ 3 CAJA",
 *   numero: 5,
 *   siglaUnidad: "HH",
 *   match: true
 * }
 */
export function extractHRNumeroFromContenido(contenido: string): {
  match: boolean
  numeroCompleto?: string
  numero?: number
  siglaUnidad?: string
  contenidoRestante?: string
} {
  if (!contenido) return { match: false }

  // Patrón: "HR Nº" seguido de números y opcionalmente texto
  const hrPattern = /^HR\s*N[º°]\s*(\d+)([^/]*)/i
  const match = contenido.match(hrPattern)

  if (!match) return { match: false }

  const numero = parseInt(match[1]) || 0
  const numeroCompleto = contenido.trim()  // Guardar el contenido completo como numeroCompleto

  // Intentar extraer sigla de unidad del formato (ej: "HR Nº5-18-A/ 3 CAJA")
  // El formato parece ser: HR Nº{numero}-{algo}-{sigla}/ ...
  const siglaMatch = contenido.match(/HR\s*N[º°]\s*\d+[^/]*-([A-Z]{2,4})/i)
  const siglaUnidad = siglaMatch ? siglaMatch[1].toUpperCase() : null

  return {
    match: true,
    numeroCompleto,
    numero,
    siglaUnidad,
    contenidoRestante: contenido
  }
}

/**
 * Parsea la suma de pesos oficiales
 * Ej: "34.700+34.500" -> 69.200
 */
export function parsePesoOficial(pesoStr: string): number | null {
  if (!pesoStr) return null

  // Si tiene el formato "34.700+34.500"
  if (pesoStr.includes('+')) {
    const parts = pesoStr.split('+').map(p => {
      const match = p.match(/([\d.,]+)/)
      return match ? parseFloat(match[1].replace(',', '.')) : 0
    })
    const sum = parts.reduce((a, b) => a + b, 0)
    return sum
  }

  return extractPeso(pesoStr)
}

/**
 * Busca un valor en los keyValuePairs por clave
 */
export function findKeyValue(keyValuePairs: any[], searchKey: string): string | null {
  if (!keyValuePairs) return null

  // Normalizar clave para búsqueda
  const normalizedSearch = searchKey.toLowerCase().trim().replace(/[:\n\r\t\s]+/g, '')

  // Buscar la mejor coincidencia usando un sistema de puntuación
  let bestPair: any = null
  let bestScore = -1

  keyValuePairs.forEach((p: any) => {
    const normalizedKey = p.key?.toLowerCase().trim().replace(/[:\n\r\t\s]+/g, '')
    let score = 0

    // Coincidencia exacta: puntuación más alta
    if (normalizedKey === normalizedSearch) {
      score = 100
    }
    // La clave empieza con la búsqueda: muy buena coincidencia
    else if (normalizedKey.startsWith(normalizedSearch) && normalizedSearch.length > 2) {
      score = 80
    }
    // La búsqueda empieza con la clave: buena coincidencia (ej: buscar "FECHA" encuentra "FECHA DE ENVIO")
    else if (normalizedSearch.startsWith(normalizedKey) && normalizedKey.length > 2) {
      score = 60
    }
    // La clave contiene la búsqueda: coincidencia débil (ej: buscar "DE" encuentra "FECHA DE ENVIO")
    else if (normalizedKey.includes(normalizedSearch) && normalizedSearch.length > 2) {
      score = 40
    }
    // La búsqueda contiene la clave: coincidencia muy débil (solo como último recurso)
    else if (normalizedSearch.includes(normalizedKey) && normalizedKey.length > 2) {
      score = 20
    }

    // Penalizar basado en la diferencia de longitud
    if (score > 0 && score < 100) {
      const lengthDiff = Math.abs(normalizedKey.length - normalizedSearch.length)
      score -= lengthDiff * 2
    }

    if (score > bestScore) {
      bestScore = score
      bestPair = p
    }
  })

  const pair = bestPair

  // DEBUG: Log en desarrollo
  if (process.env.NODE_ENV === 'development' && pair) {
    console.log(`   🔍 [findKeyValue] Buscando: "${searchKey}" -> Encontrado: key="${pair.key}", value="${pair.value?.substring(0, 50)}${pair.value?.length > 50 ? '...' : ''}"`)
  }

  // Retornar el valor, también limpiando saltos de línea si existen
  const value = pair?.value || null
  if (value && typeof value === 'string') {
    return value.replace(/[\n\r]+/g, ' ').trim()
  }
  return value
}

/**
 * Determina el tipo de valija (ENTRADA/SALIDA)
 */
export function determinarTipoValija(content?: string): 'ENTRADA' | 'SALIDA' {
  if (!content) return 'ENTRADA'

  const normalized = content.toUpperCase()
  const salidaSignals = ['SALIDA', 'EXPORT', 'OUTBOUND', 'DESPACHO', 'PARTIDA']
  const hasSalida = salidaSignals.some((signal) => normalized.includes(signal))

  return hasSalida ? 'SALIDA' : 'ENTRADA'
}

/**
 * Determina si la guía es extraordinaria basándose en el remitente y contenido
 * Detecta la palabra "EXTRAORDINARIA" en el campo remitenteRaw o en el contenido completo
 */
export function determinarIsExtraordinaria(remitenteRaw: string, content?: string): boolean {
  if (!remitenteRaw && !content) return false

  // Buscar en el campo remitente
  if (remitenteRaw && remitenteRaw.toUpperCase().includes('EXTRAORDINARIA')) {
    return true
  }

  // Buscar en el contenido completo del documento
  if (content && content.toUpperCase().includes('EXTRAORDINARIA')) {
    return true
  }

  return false
}

/**
 * Extrae la ciudad de un destinatario/remitente
 * Ej: "LEPRU TOKIO" → "TOKIO"
 */
export function extractCiudad(texto: string): string | null {
  if (!texto) return null

  const upper = texto.toUpperCase()

  // Lista de ciudades conocidas
  const ciudades = [
    'TOKIO', 'TOKYO', 'NAGOYA', 'OSAKA', 'KYOTO',
    'LIMA', 'AREQUIPA', 'CUSCO', 'TRUJILLO', 'PIURA', 'CHICLAYO',
    'WASHINGTON', 'NEW york', 'MIAMI', 'LOS ANGELES',
    'MADRID', 'BARCELONA',
    'BUENOS AIRES', 'CORDOBA',
    'SANTIAGO', 'VALPARAISO',
    'BOGOTA', 'MEDELLIN',
    'CARACAS', 'MARACAIBO',
    'QUITO', 'GUAYAQUIL',
    'LA PAZ', 'SUCRE',
    'ASUNCION',
    'MONTEVIDEO',
    'BRASILIA', 'RIO DE JANEIRO', 'SAO PAULO'
  ]

  for (const ciudad of ciudades) {
    if (upper.includes(ciudad)) {
      return ciudad
    }
  }

  return null
}

/**
 * Normaliza nombres de lugares conocidos que pueden tener espacios incorrectos
 * Ej: "LEPRU TOKIO" -> "LEPRUTOKIO"
 */
export function normalizeLugarNombre(text: string, keys: string[]): string {
  if (!text) return text

  const upper = text.toUpperCase().trim()

  // Lista de normalizaciones conocidas (90% de casos)
  const normalizaciones: Record<string, string> = {
    'LEPRU TOKIO': 'LEPRUTOKIO',
  }

  // Verificar si el texto coincide con alguna normalización
  for (const [incorrecto, correcto] of Object.entries(normalizaciones)) {
    if (upper === incorrecto) {
      return correcto
    }
  }

  return text
}

/**
 * Determina el país basado en el nombre de la ciudad
 */
export function getPaisFromCiudad(ciudad: string): string {
  const upper = ciudad.toUpperCase()

  // Mapeo de ciudades a países
  const paises: Record<string, string> = {
    'TOKIO': 'JAPÓN',
    'TOKYO': 'JAPÓN',
    'NAGOYA': 'JAPÓN',
    'OSAKA': 'JAPÓN',
    'KYOTO': 'JAPÓN',
    'LIMA': 'PERÚ',
    'AREQUIPA': 'PERÚ',
    'CUSCO': 'PERÚ',
    'TRUJILLO': 'PERÚ',
    'PIURA': 'PERÚ',
    'CHICLAYO': 'PERÚ',
    'WASHINGTON': 'ESTADOS UNIDOS',
    'NEW YORK': 'ESTADOS UNIDOS',
    'MIAMI': 'ESTADOS UNIDOS',
    'LOS ANGELES': 'ESTADOS UNIDOS',
    'MADRID': 'ESPAÑA',
    'BARCELONA': 'ESPAÑA',
    'BUENOS AIRES': 'ARGENTINA',
    'CORDOBA': 'ARGENTINA',
    'SANTIAGO': 'CHILE',
    'VALPARAISO': 'CHILE',
    'BOGOTA': 'COLOMBIA',
    'MEDELLIN': 'COLOMBIA',
    'CARACAS': 'VENEZUELA',
    'MARACAIBO': 'VENEZUELA',
    'QUITO': 'ECUADOR',
    'GUAYAQUIL': 'ECUADOR',
    'LA PAZ': 'BOLIVIA',
    'SUCRE': 'BOLIVIA',
    'ASUNCION': 'PARAGUAY',
    'MONTEVIDEO': 'URUGUAY',
    'BRASILIA': 'BRASIL',
    'RIO DE JANEIRO': 'BRASIL',
    'SAO PAULO': 'BRASIL',
  }

  // Buscar coincidencia exacta o parcial
  for (const [ciudadKey, pais] of Object.entries(paises)) {
    if (upper.includes(ciudadKey)) {
      return pais
    }
  }

  return 'DESCONOCIDO'
}

/**
 * Parsea items de la tabla principal
 */
export function parseItemsFromTables(tables: any[]): any[] {
  if (!tables || tables.length < 2) return []

  // La tabla de items es generalmente la segunda tabla (índice 1)
  const itemsTable = tables[1]

  if (!itemsTable || !itemsTable.cells) return []

  const items: any[] = []
  const rows = itemsTable.rowCount
  const cols = itemsTable.columnCount

  // Obtener cabeceras
  const headers: string[] = []
  for (let c = 0; c < cols; c++) {
    const headerCell = itemsTable.cells.find((cell: any) =>
      cell.kind === 'columnHeader' && cell.columnIndex === c
    )
    headers[c] = headerCell?.content || ''
  }

  // Logging de cabeceras
  if (process.env.NODE_ENV === 'development') {
    console.log('\n📋 [PARSE ITEMS] Tabla de items detectada:')
    console.log('   Filas:', rows, 'Columnas:', cols)
    console.log('   Cabeceras:', headers)
  }

  // Extraer filas de datos
  for (let r = 1; r < rows; r++) {
    const item: any = {}

    for (let c = 0; c < cols; c++) {
      const cell = itemsTable.cells.find((cell: any) =>
        cell.rowIndex === r && cell.columnIndex === c
      )

      if (cell) {
        const header = headers[c]?.toLowerCase()
        const content = cell.content?.trim() || ''

        // Mapear según cabecera
        if (header.includes('nº') || header.includes('numero')) {
          item.numeroItem = parseInt(content.replace(/\D/g, '')) || r
        } else if (header.includes('destinatario')) {
          item.destinatario = content
        } else if (header.includes('contenido')) {
          item.contenido = content
        } else if (header.includes('remitente')) {
          item.remitente = content
        } else if (header.includes('can') || header.includes('cantidad')) {
          item.cantidad = parseInt(content) || null
        } else if (header.includes('peso')) {
          item.peso = extractPeso(content)
        }
      }
    }

    if (item.destinatario || item.contenido) {
      items.push(item)

      // Logging de cada item
      if (process.env.NODE_ENV === 'development') {
        console.log(`   Item ${r}:`, item)
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`   ✅ Total items parseados: ${items.length}\n`)
  }

  return items
}

/**
 * Parsea precintos de la primera tabla
 */
export function parsePrecintosFromTables(tables: any[]): any[] {
  if (!tables || tables.length === 0) return []

  // La tabla de precintos es generalmente la primera tabla (índice 0)
  const precintosTable = tables[0]

  if (!precintosTable || !precintosTable.cells) return []

  const precintos: any[] = []
  const rows = precintosTable.rowCount
  const cols = precintosTable.columnCount

  // Obtener cabeceras
  const headers: string[] = []
  for (let c = 0; c < cols; c++) {
    const headerCell = precintosTable.cells.find((cell: any) =>
      cell.kind === 'columnHeader' && cell.columnIndex === c
    )
    headers[c] = headerCell?.content || ''
  }

  // Logging de cabeceras
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🔒 [PARSE PRECINTOS] Tabla de precintos detectada:')
    console.log('   Filas:', rows, 'Columnas:', cols)
    console.log('   Cabeceras:', headers)
  }

  // Extraer filas de datos (saltar cabecera)
  for (let r = 1; r < rows; r++) {
    const precinto: any = {}

    for (let c = 0; c < cols; c++) {
      const cell = precintosTable.cells.find((cell: any) =>
        cell.rowIndex === r && cell.columnIndex === c
      )

      if (cell) {
        const header = headers[c]?.toLowerCase()
        const content = cell.content?.trim() || ''

        // Mapear según cabecera
        if (header.includes('precinto') && !header.includes('cable')) {
          precinto.precinto = content
        } else if (header.includes('precinto/cable')) {
          precinto.precintoCable = content
        } else if (header.includes('bolsa')) {
          precinto.numeroBolsaTamano = content
        } else if (header.includes('guía') || header.includes('aérea')) {
          precinto.guiaAereaNumero = content
        }
      }
    }

    // Agregar si tiene algún dato
    if (Object.values(precinto).some(v => v)) {
      precintos.push(precinto)

      // Logging de cada precinto
      if (process.env.NODE_ENV === 'development') {
        console.log(`   Precinto ${r}:`, precinto)
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`   ✅ Total precintos parseados: ${precintos.length}\n`)
  }

  return precintos
}

/**
 * Procesa el resultado de Azure y crea una Guía de Valija
 */
export async function processGuiaValijaFromAzure(
  azureResult: any,
  userId: string,
  fileName: string,
  file?: File
) {
  const { keyValuePairs, tables, content } = azureResult

  // Extraer campos principales de keyValuePairs
  let destinatario = findKeyValue(keyValuePairs, 'PARA') ||
                     findKeyValue(keyValuePairs, 'DESTINATARIO') ||
                     'DESCONOCIDO'

  // Normalizar nombres de lugares conocidos (ej: LEPRU TOKIO -> LEPRUTOKIO)
  destinatario = normalizeLugarNombre(destinatario, ['PARA', 'DESTINATARIO'])

  const remitenteRaw = findKeyValue(keyValuePairs, 'DE') ||
                       findKeyValue(keyValuePairs, 'REMITENTE') ||
                       'UNIDAD DE VALIJA DIPLOMÁTICA'

  // Si el remitente contiene "GUÍA DE VALIJA DIPLOMÁTICA NºXX", extraer solo el número
  const remitente = extractNumeroFromRemitente(remitenteRaw)

  const fechaEnvioStr = findKeyValue(keyValuePairs, 'FECHA DE ENVIO')
  const fechaReciboStr = findKeyValue(keyValuePairs, 'FECHA DE RECIBO')
  const totalItemsStr = findKeyValue(keyValuePairs, 'Total de Items')
  const pesoTotalStr = findKeyValue(keyValuePairs, 'Peso Total') || findKeyValue(keyValuePairs, 'PESO TOTAL')
  const pesoOficialStr = findKeyValue(keyValuePairs, 'Peso Oficial')
  const preparadoPor = findKeyValue(keyValuePairs, 'Preparado Por')
  const revisadoPor = findKeyValue(keyValuePairs, 'Revisado Por')
  const observaciones = findKeyValue(keyValuePairs, 'OBSERVACIONES')
  const firmaReceptor = findKeyValue(keyValuePairs, 'FIRMA DEL RECEPTOR')

  // Extraer número de guía del contenido o del remitente raw
  let numeroGuia = extractNumeroGuia(content || remitenteRaw || destinatario)

  // Parsear fechas
  const fechaEnvio = parseFecha(fechaEnvioStr || '')
  const fechaRecibo = parseFecha(fechaReciboStr || '')

  // Agregar año al número de guía para hacerlo único (ej: "14" -> "14-2025")
  if (numeroGuia && fechaEnvio) {
    const año = fechaEnvio.getFullYear()
    numeroGuia = `${numeroGuia}-${año}`
  } else if (numeroGuia) {
    // Si no hay fecha, usar el año actual
    const año = new Date().getFullYear()
    numeroGuia = `${numeroGuia}-${año}`
  }

  // Parsear pesos
  const pesoValija = extractPeso(pesoTotalStr || '')
  const pesoOficial = parsePesoOficial(pesoOficialStr || '')

  // Parsear total de items
  const numeroPaquetes = totalItemsStr ? parseInt(totalItemsStr.replace(/\D/g, '')) : null

  // Determinar tipo de valija (siempre ENTRADA)
  const tipoValija = determinarTipoValija(content)

  // Determinar si es guía extraordinaria
  const isExtraordinaria = determinarIsExtraordinaria(remitenteRaw, content)

  // Agregar sufijo al número de guía si es extraordinaria para evitar duplicados
  if (isExtraordinaria && numeroGuia) {
    // Remover el año si existe, agregar sufijo EXT, y volver a agregar el año
    const parts = numeroGuia.split('-')
    const num = parts[0] // "01"
    const year = parts[1] || new Date().getFullYear().toString() // "2025"
    numeroGuia = `${num}EXT-${year}` // "01EXT-2025"
  }

  // Extraer ciudades de origen y destino (usar remitenteRaw para búsqueda)
  const origenCiudad = extractCiudad(remitenteRaw)
  const destinoCiudad = extractCiudad(destinatario)

  // Determinar países
  const origenPais = origenCiudad ? getPaisFromCiudad(origenCiudad) : null
  const destinoPais = destinoCiudad ? getPaisFromCiudad(destinoCiudad) : null

  // Parsear items y precintos de las tablas
  const itemsData = parseItemsFromTables(tables || [])
  const precintosData = parsePrecintosFromTables(tables || [])

  // Logging: Mostrar todos los datos extraídos antes de guardar
  logger.separator('─', 70)
  logger.info('📋 DATOS EXTRAÍDOS PARA GUARDAR GUÍA DE VALIJA')
  logger.separator('─', 70)
  console.log(`   Nº Guía:        ${numeroGuia}`)
  console.log(`   Tipo Valija:    ${tipoValija}`)
  console.log(`   Destinatario:   ${destinatario}`)
  console.log(`   Remitente:      ${remitente}`)
  console.log(`   Fecha Envío:    ${fechaEnvio ? fechaEnvio.toISOString() : 'N/A'}`)
  console.log(`   Fecha Recibo:   ${fechaRecibo ? fechaRecibo.toISOString() : 'N/A'}`)
  console.log(`   Origen:         ${origenCiudad} (${origenPais})`)
  console.log(`   Destino:        ${destinoCiudad} (${destinoPais})`)
  console.log(`   Peso Valija:    ${pesoValija || 'N/A'} Kgrs.`)
  console.log(`   Peso Oficial:   ${pesoOficial || 'N/A'} Kgrs.`)
  console.log(`   Total Items:    ${numeroPaquetes || 'N/A'}`)
  console.log(`   Observaciones:  ${observaciones || 'N/A'}`)
  console.log(`   Preparado Por:  ${preparadoPor || 'N/A'}`)
  console.log(`   Revisado Por:   ${revisadoPor || 'N/A'}`)
  logger.separator('─', 70)
  console.log(`   Items detectados: ${itemsData.length}`)
  itemsData.forEach((item, idx) => {
    console.log(`     ${idx + 1}. Nº: ${item.numeroItem}, Dest: ${item.destinatario}, Contenido: ${item.contenido}, CANT: ${item.cantidad}, Peso: ${item.peso}`)
  })
  logger.separator('─', 70)
  console.log(`   Precintos detectados: ${precintosData.length}`)
  precintosData.forEach((precinto, idx) => {
    console.log(`     ${idx + 1}. Precinto: ${precinto.precinto || 'N/A'}, Cable: ${precinto.precintoCable || 'N/A'}, Bolsa: ${precinto.numeroBolsaTamano || 'N/A'}, Guía Aérea: ${precinto.guiaAereaNumero || 'N/A'}`)
  })
  logger.separator('─', 70)

  // Usar upsert: crear si no existe, actualizar si ya existe
  logger.info(`⏳ Guardando guía de valija: ${numeroGuia}`)

  const guia = await prisma.guiaValija.upsert({
    where: { numeroGuia },
    create: {
      userId,
      numeroGuia,
      tipoValija,
      isExtraordinaria,
      fechaEnvio,
      fechaRecibo,
      destinatarioNombre: destinatario,
      remitenteNombre: remitente,
      origenDireccion: null,
      destinoDireccion: null,
      origenCiudad,
      destinoCiudad,
      origenPais,
      destinoPais,
      pesoValija,
      pesoOficial,
      numeroPaquetes,
      observaciones,
      preparadoPor,
      revisadoPor,
      firmaReceptor,
      processingStatus: "completed",
      azureRawData: azureResult,
      contenidoTexto: content,
      paresClaveValor: keyValuePairs,
      tablas: tables,
    },
    update: {
      tipoValija,
      isExtraordinaria,
      fechaEnvio,
      fechaRecibo,
      destinatarioNombre: destinatario,
      remitenteNombre: remitente,
      origenCiudad,
      destinoCiudad,
      origenPais,
      destinoPais,
      pesoValija,
      pesoOficial,
      numeroPaquetes,
      observaciones,
      preparadoPor,
      revisadoPor,
      firmaReceptor,
      azureRawData: azureResult,
      contenidoTexto: content,
      paresClaveValor: keyValuePairs,
      tablas: tables,
    },
  })

  logger.success(`✅ Guía de valija guardada: ID=${guia.id}, Nº=${numeroGuia}`)

  // Save file to local storage if provided
  if (file) {
    try {
      const saveResult = await fileStorageService.saveFile({
        entityType: 'GUIAENTRADA',
        entityId: guia.id,
        file: file,
        date: fechaEnvio || new Date()
      })

      if (saveResult.success && saveResult.relativePath) {
        await prisma.guiaValija.update({
          where: { id: guia.id },
          data: { filePath: saveResult.relativePath }
        })
        logger.storage('FILE_SAVED', `Guía de Valija ${numeroGuia}: ${saveResult.relativePath}`)
      } else {
        logger.warn('File storage failed:', saveResult.error)
      }
    } catch (error) {
      logger.error('File storage error:', error)
      // Continue with DB save even if file storage fails
    }
  }

  // Siempre eliminar items y precintos existentes antes de crear nuevos (para re-subidas)
  logger.info(`🗑️  Eliminando items y precintos anteriores de la guía...`)
  await prisma.guiaValijaItem.deleteMany({
    where: { guiaValijaId: guia.id }
  })

  await prisma.guiaValijaPrecinto.deleteMany({
    where: { guiaValijaId: guia.id }
  })

  // Crear items (usar createMany después de deleteMany para evitar duplicados)
  if (itemsData.length > 0) {
    logger.info(`📦 Creando ${itemsData.length} items...`)

    // Crear los nuevos items - asignar numeroItem automáticamente si es undefined/null
    await prisma.guiaValijaItem.createMany({
      data: itemsData.map((item, index) => ({
        guiaValijaId: guia.id,
        numeroItem: item.numeroItem ?? (index + 1), // Usar índice+1 si numeroItem es undefined/null
        destinatario: item.destinatario || '',
        contenido: item.contenido || '',
        remitente: item.remitente || null,
        cantidad: item.cantidad || null,
        peso: item.peso || null,
      })),
    })
    logger.success(`✅ Items creados exitosamente`)

    // ===== NUEVA LÓGICA: Detectar y crear Hojas de Remisión =====
    logger.info(`🔍 Buscando items que contienen 'HR Nº'...`)

    // Obtener items creados con sus IDs
    const createdItems = await prisma.guiaValijaItem.findMany({
      where: { guiaValijaId: guia.id },
    })

    let hojasRemisionCreadas = 0

    for (const item of createdItems) {
      const hrData = extractHRNumeroFromContenido(item.contenido)

      if (hrData.match) {
        logger.info(`   ✨ Item ${item.numeroItem} contiene referencia HR: ${hrData.numeroCompleto}`)

        // Usar upsert para crear o actualizar si ya existe
        const hojaRemision = await prisma.hojaRemision.upsert({
          where: { numeroCompleto: hrData.numeroCompleto || `HR-${item.numeroItem}` },
          create: {
            userId: userId,
            numero: hrData.numero || 0,
            numeroCompleto: hrData.numeroCompleto || `HR-${item.numeroItem}`,
            siglaUnidad: hrData.siglaUnidad || '',
            fecha: guia.fechaEnvio || new Date(),
            para: item.destinatario || 'Por Asignar',
            remitente: item.remitente || 'Por Asignar',
            documento: `Extraído de Guía de Valija ${guia.numeroGuia}`,
            asunto: `Item ${item.numeroItem} de Guía de Valija`,
            destino: `${guia.destinoCiudad || ''}, ${guia.destinoPais || ''}`,
            peso: item.peso || null,
            estado: 'borrador',
            processingStatus: 'completed',
          },
          update: {
            // Actualizar campos si ya existe
            para: item.destinatario || 'Por Asignar',
            remitente: item.remitente || 'Por Asignar',
            peso: item.peso || null,
            updatedAt: new Date(),
          },
        })

        // Actualizar el item con la referencia a la Hoja de Remisión
        await prisma.guiaValijaItem.update({
          where: { id: item.id },
          data: { hojaRemisionId: hojaRemision.id },
        })

        hojasRemisionCreadas++
        logger.success(`   ✅ Hoja de Remisión ${hojaRemision.createdAt === hojaRemision.updatedAt ? 'creada' : 'actualizada'}: ID=${hojaRemision.id}, ${hojaRemision.numeroCompleto}`)
      }
    }

    if (hojasRemisionCreadas > 0) {
      logger.success(`🎉 Total de Hojas de Remisión creadas: ${hojasRemisionCreadas}`)
    } else {
      logger.info(`ℹ️  No se encontraron items con formato 'HR Nº'`)
    }
  }

  // Crear precintos
  if (precintosData.length > 0) {
    logger.info(`🔒 Creando ${precintosData.length} precintos...`)
    await prisma.guiaValijaPrecinto.createMany({
      data: precintosData.map(precinto => ({
        guiaValijaId: guia.id,
        precinto: precinto.precinto || null,
        precintoCable: precinto.precintoCable || null,
        numeroBolsaTamano: precinto.numeroBolsaTamano || null,
        guiaAereaNumero: precinto.guiaAereaNumero || null,
      })),
    })
    logger.success(`✅ Precintos creados exitosamente`)
  }

  // Retornar la guía con sus relaciones
  const guiaFinal = await prisma.guiaValija.findUnique({
    where: { id: guia.id },
    include: {
      items: true,
      precintos: true,
    },
  })

  // Logging final
  if (guiaFinal) {
    logger.separator('═', 70)
    logger.success('🎉 GUÍA DE VALIJA GUARDADA EXITOSAMENTE')
    logger.separator('═', 70)
    console.log(`   ID:             ${guiaFinal.id}`)
    console.log(`   Nº Guía:        ${guiaFinal.numeroGuia}`)
    console.log(`   Tipo:           ${guiaFinal.tipoValija}`)
    console.log(`   Destinatario:   ${guiaFinal.destinatarioNombre}`)
    console.log(`   Origen:         ${guiaFinal.origenCiudad || 'N/A'} (${guiaFinal.origenPais || 'N/A'})`)
    console.log(`   Destino:        ${guiaFinal.destinoCiudad || 'N/A'} (${guiaFinal.destinoPais || 'N/A'})`)
    console.log(`   Fecha Envío:    ${guiaFinal.fechaEnvio ? guiaFinal.fechaEnvio.toLocaleDateString() : 'N/A'}`)
    console.log(`   Peso Valija:    ${guiaFinal.pesoValija || 'N/A'} Kgrs.`)
    console.log(`   Peso Oficial:   ${guiaFinal.pesoOficial || 'N/A'} Kgrs.`)
    console.log(`   Total Items:    ${guiaFinal.items?.length || 0}`)
    console.log(`   Total Precintos: ${guiaFinal.precintos?.length || 0}`)
    logger.separator('═', 70)

    // Mostrar items guardados
    if (guiaFinal.items && guiaFinal.items.length > 0) {
      console.log(`\n📦 ITEMS GUARDADOS (${guiaFinal.items.length}):`)
      guiaFinal.items.forEach((item, idx) => {
        console.log(`   ${idx + 1}. Nº: ${item.numeroItem}, Dest: ${item.destinatario}, Cont: ${item.contenido}, CANT: ${item.cantidad}, Peso: ${item.peso}`)
      })
    }

    // Mostrar precintos guardados
    if (guiaFinal.precintos && guiaFinal.precintos.length > 0) {
      console.log(`\n🔒 PRECINTOS GUARDADOS (${guiaFinal.precintos.length}):`)
      guiaFinal.precintos.forEach((precinto, idx) => {
        console.log(`   ${idx + 1}. Precinto: ${precinto.precinto || 'N/A'}, Cable: ${precinto.precintoCable || 'N/A'}, Bolsa: ${precinto.numeroBolsaTamano || 'N/A'}, Guía Aérea: ${precinto.guiaAereaNumero || 'N/A'}`)
      })
    }

    logger.separator('═', 70)
  }

  return guiaFinal
}
