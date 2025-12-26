import { prisma } from "./db"

/**
 * Extrae el número de guía de un texto
 * Ej: "GUÍA DE VALIJA DIPLOMÁTICA Nº02." -> "02"
 */
export function extractNumeroGuia(text: string): string {
  // Busca patrones como: Nº02, No 02, #02, etc.
  const match = text.match(/N[º°]\s*(\d+)|NO\s*[:.]?\s*(\d+)|#\s*(\d+)/i)
  if (match && match[1]) {
    return match[1].padStart(4, '0') // Pad con ceros a la izquierda
  }
  // Si no encuentra, extrae cualquier número
  const numberMatch = text.match(/(\d+)/)
  return numberMatch ? numberMatch[1].padStart(4, '0') : "0001"
}

/**
 * Parsea fecha en formato DD/MM/YYYY
 */
export function parseFecha(fechaStr: string): Date | null {
  if (!fechaStr) return null

  // Formato DD/MM/YYYY
  const match = fechaStr.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match) {
    const [, day, month, year] = match
    return new Date(`${year}-${month}-${day}`)
  }

  // Intentar parseo directo
  const date = new Date(fechaStr)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Extrae peso numérico de un string
 * Ej: "63.810 Kgrs." -> 63.810
 */
export function extractPeso(pesoStr: string): number | null {
  if (!pesoStr) return null
  const match = pesoStr.match(/([\d.,]+)/)
  if (match) {
    const cleaned = match[1].replace(/[.,]/g, (m) => m === ',' ? '.' : '')
    return parseFloat(cleaned)
  }
  return null
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
  const normalizedSearch = searchKey.toLowerCase().trim().replace(/[:\s]/g, '')

  const pair = keyValuePairs.find((p: any) => {
    const normalizedKey = p.key?.toLowerCase().trim().replace(/[:\s]/g, '')
    return normalizedKey === normalizedKey ||
           normalizedKey.includes(normalizedSearch) ||
           normalizedSearch.includes(normalizedKey)
  })

  return pair?.value || null
}

/**
 * Determina el tipo de valija (ENTRADA o SALIDA)
 * Si el remitente es UNIDAD DE VALIJA DIPLOMÁTICA → SALIDA
 * Si el destinatario es UNIDAD DE VALIJA DIPLOMÁTICA → ENTRADA
 */
export function determinarTipoValija(remitente: string, destinatario: string): string {
  const remitenteUpper = remitente.toUpperCase()
  const destinatarioUpper = destinatario.toUpperCase()

  // Si el remitente contiene "UNIDAD DE VALIJA DIPLOMÁTICA" o variantes
  if (remitenteUpper.includes('UNIDAD DE VALIJA') ||
      remitenteUpper.includes('VALIJA DIPLOMATICA') ||
      remitenteUpper.includes('MINISTERIO DE RELACIONES EXTERIORES')) {
    return 'SALIDA'
  }

  // Si el destinatario contiene "UNIDAD DE VALIJA DIPLOMÁTICA" o variantes
  if (destinatarioUpper.includes('UNIDAD DE VALIJA') ||
      destinatarioUpper.includes('VALIJA DIPLOMATICA') ||
      destinatarioUpper.includes('MINISTERIO DE RELACIONES EXTERIORES')) {
    return 'ENTRADA'
  }

  // Por defecto, asumimos SALIDA
  return 'SALIDA'
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
    }
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
    }
  }

  return precintos
}

/**
 * Procesa el resultado de Azure y crea una Guía de Valija
 */
export async function processGuiaValijaFromAzure(
  azureResult: any,
  userId: string,
  fileName: string
) {
  const { keyValuePairs, tables, content } = azureResult

  // Extraer campos principales de keyValuePairs
  const destinatario = findKeyValue(keyValuePairs, 'PARA') ||
                       findKeyValue(keyValuePairs, 'DESTINATARIO') ||
                       'DESCONOCIDO'

  const remitente = findKeyValue(keyValuePairs, 'DE') ||
                    findKeyValue(keyValuePairs, 'REMITENTE') ||
                    'UNIDAD DE VALIJA DIPLOMÁTICA'

  const fechaEnvioStr = findKeyValue(keyValuePairs, 'FECHA DE ENVIO')
  const fechaReciboStr = findKeyValue(keyValuePairs, 'FECHA DE RECIBO')
  const totalItemsStr = findKeyValue(keyValuePairs, 'Total de Items')
  const pesoTotalStr = findKeyValue(keyValuePairs, 'Peso Total') || findKeyValue(keyValuePairs, 'PESO TOTAL')
  const pesoOficialStr = findKeyValue(keyValuePairs, 'Peso Oficial')
  const preparadoPor = findKeyValue(keyValuePairs, 'Preparado Por')
  const revisadoPor = findKeyValue(keyValuePairs, 'Revisado Por')
  const observaciones = findKeyValue(keyValuePairs, 'OBSERVACIONES')
  const firmaReceptor = findKeyValue(keyValuePairs, 'FIRMA DEL RECEPTOR')

  // Extraer número de guía del contenido
  let numeroGuia = extractNumeroGuia(content || remitente || destinatario)

  // Parsear fechas
  const fechaEnvio = parseFecha(fechaEnvioStr || '')
  const fechaRecibo = parseFecha(fechaReciboStr || '')

  // Parsear pesos
  const pesoValija = extractPeso(pesoTotalStr || '')
  const pesoOficial = parsePesoOficial(pesoOficialStr || '')

  // Parsear total de items
  const numeroPaquetes = totalItemsStr ? parseInt(totalItemsStr.replace(/\D/g, '')) : null

  // Determinar tipo de valija (ENTRADA o SALIDA)
  const tipoValija = determinarTipoValija(remitente, destinatario)

  // Extraer ciudades de origen y destino
  const origenCiudad = extractCiudad(remitente)
  const destinoCiudad = extractCiudad(destinatario)

  // Determinar países
  const origenPais = origenCiudad ? getPaisFromCiudad(origenCiudad) : null
  const destinoPais = destinoCiudad ? getPaisFromCiudad(destinoCiudad) : null

  // Parsear items y precintos de las tablas
  const itemsData = parseItemsFromTables(tables || [])
  const precintosData = parsePrecintosFromTables(tables || [])

  // Crear la guía de valija
  const guia = await prisma.guiaValija.create({
    data: {
      userId,
      numeroGuia,
      tipoValija,
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
  })

  // Crear items
  if (itemsData.length > 0) {
    await prisma.guiaValijaItem.createMany({
      data: itemsData.map(item => ({
        guiaValijaId: guia.id,
        numeroItem: item.numeroItem || 0,
        destinatario: item.destinatario || '',
        contenido: item.contenido || '',
        remitente: item.remitente || null,
        cantidad: item.cantidad || null,
        peso: item.peso || null,
      })),
    })
  }

  // Crear precintos
  if (precintosData.length > 0) {
    await prisma.guiaValijaPrecinto.createMany({
      data: precintosData.map(precinto => ({
        guiaValijaId: guia.id,
        precinto: precinto.precinto || null,
        precintoCable: precinto.precintoCable || null,
        numeroBolsaTamano: precinto.numeroBolsaTamano || null,
        guiaAereaNumero: precinto.guiaAereaNumero || null,
      })),
    })
  }

  // Retornar la guía con sus relaciones
  return await prisma.guiaValija.findUnique({
    where: { id: guia.id },
    include: {
      items: true,
      precintos: true,
    },
  })
}
