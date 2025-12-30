export interface DocumentAnalysis {
  idioma: 'español' | 'ingles' | 'frances' | 'portugues'
  tipoDocumento: 'guia_valija' | 'hoja_remision' | 'nota_diplomatica'
  direccion: 'entrada' | 'salida'
  confidence: {
    idioma: number
    tipoDocumento: number
    direccion: number
  }
  extractedData: any
  keyIndicators: {
    languageKeywords: string[]
    documentTypeKeywords: string[]
    directionKeywords: string[]
  }
}

export class DocumentAnalyzer {

  // Palabras clave para detección de idioma
  private static languageKeywords = {
    español: ['el', 'la', 'de', 'en', 'por', 'con', 'para', 'una', 'los', 'las', 'del', 'al', 'los', 'las', 'un', 'una', 'que', 'se', 'no', 'ha'],
    ingles: ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his'],
    frances: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'sur', 'pas', 'plus', 'pouvoir', 'veux', 'je'],
    portugues: ['o', 'a', 'e', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'não', 'é', 'que', 'este', 'ou', 'como', 'mas', 'foi', 'são', 'eram']
  }

  // Palabras clave para detección de tipo de documento
  private static documentTypeKeywords = {
    guia_valija: ['guía', 'valija', 'diplomática', 'pouch', 'diplomatic', 'guide', 'embajada', 'consulado'],
    hoja_remision: ['hoja', 'remisión', 'remision', 'remito', 'despacho', 'shipping', 'invoice', 'delivery'],
    nota_diplomatica: ['nota', 'diplomática', 'comunicado', 'memorándum', ' diplomatic', 'note', 'memorandum']
  }

  // Palabras clave para detección de dirección
  private static directionKeywords = {
    entrada: ['entrada', 'import', 'arribó', 'llegada', 'arrival', 'inbound', 'recibido', 'received'],
    salida: ['salida', 'export', 'enviado', 'despacho', 'dispatch', 'outbound', 'partida', 'departure']
  }

  /**
   * Analiza un documento para detectar idioma, tipo y dirección
   */
  static async analyze(content: string, tables?: any[], keyValuePairs?: any[]): Promise<DocumentAnalysis> {

    // Normalizar contenido para análisis
    const normalizedContent = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Detectar idioma
    const languageAnalysis = this.detectLanguage(normalizedContent)

    // Detectar tipo de documento
    const documentTypeAnalysis = this.detectDocumentType(normalizedContent)

    // Detectar dirección
    const directionAnalysis = this.detectDirection(normalizedContent)

    // Extraer datos estructurados según el tipo detectado
    const extractedData = this.extractStructuredData(
      content,
      documentTypeAnalysis.type,
      languageAnalysis.language,
      directionAnalysis.direction,
      tables,
      keyValuePairs
    )

    return {
      idioma: languageAnalysis.language,
      tipoDocumento: documentTypeAnalysis.type,
      direccion: directionAnalysis.direction,
      confidence: {
        idioma: languageAnalysis.confidence,
        tipoDocumento: documentTypeAnalysis.confidence,
        direccion: directionAnalysis.confidence
      },
      extractedData,
      keyIndicators: {
        languageKeywords: languageAnalysis.foundKeywords,
        documentTypeKeywords: documentTypeAnalysis.foundKeywords,
        directionKeywords: directionAnalysis.foundKeywords
      }
    }
  }

  private static detectLanguage(content: string) {
    let maxScore = 0
    let detectedLanguage: 'español' | 'ingles' | 'frances' | 'portugues' = 'español'
    const foundKeywords: string[] = []

    Object.entries(this.languageKeywords).forEach(([language, keywords]) => {
      let score = 0
      const found: string[] = []

      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g')
        const matches = content.match(regex)
        if (matches) {
          score += matches.length
          found.push(keyword)
        }
      })

      if (score > maxScore) {
        maxScore = score
        detectedLanguage = language as any
        foundKeywords.push(...found)
      }
    })

    // Calcular confianza (0-1)
    const confidence = Math.min(maxScore / 20, 1) // Normalizar a 20 palabras como máximo

    return { language: detectedLanguage, confidence, foundKeywords }
  }

  private static detectDocumentType(content: string) {
    let maxScore = 0
    let detectedType: 'guia_valija' | 'hoja_remision' | 'nota_diplomatica' = 'guia_valija'
    const foundKeywords: string[] = []

    Object.entries(this.documentTypeKeywords).forEach(([type, keywords]) => {
      let score = 0
      const found: string[] = []

      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g')
        const matches = content.match(regex)
        if (matches) {
          score += matches.length * 2 // Ponderar más las palabras de tipo documento
          found.push(keyword)
        }
      })

      if (score > maxScore) {
        maxScore = score
        detectedType = type as any
        foundKeywords.push(...found)
      }
    })

    const confidence = Math.min(maxScore / 10, 1) // Normalizar a 10 palabras clave

    return { type: detectedType, confidence, foundKeywords }
  }

  private static detectDirection(content: string) {
    let entradaScore = 0
    let salidaScore = 0
    const foundKeywords: string[] = []

    // Palabras de entrada
    this.directionKeywords.entrada.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g')
      const matches = content.match(regex)
      if (matches) {
        entradaScore += matches.length
        foundKeywords.push(keyword)
      }
    })

    // Palabras de salida
    this.directionKeywords.salida.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g')
      const matches = content.match(regex)
      if (matches) {
        salidaScore += matches.length
        foundKeywords.push(keyword)
      }
    })

    let detectedDirection: 'entrada' | 'salida' = 'entrada'
    let confidence = 0

    if (salidaScore > entradaScore) {
      detectedDirection = 'salida'
      confidence = Math.min(salidaScore / 5, 1)
    } else if (entradaScore > 0) {
      confidence = Math.min(entradaScore / 5, 1)
    } else {
      confidence = 0.5 // Valor por defecto si no se detectan palabras
    }

    return { direction: detectedDirection, confidence, foundKeywords }
  }

  private static extractStructuredData(
    content: string,
    tipoDocumento: string,
    idioma: string,
    direccion: string,
    tables?: any[],
    keyValuePairs?: any[]
  ) {
    const extracted: any = {
      tipoDocumento,
      idioma,
      direccion,
      detectedAt: new Date().toISOString()
    }

    // Extraer datos según el tipo de documento
    if (tipoDocumento === 'guia_valija') {
      Object.assign(extracted, this.extractGuiaValijaData(content, tables, keyValuePairs))
    } else if (tipoDocumento === 'hoja_remision') {
      Object.assign(extracted, this.extractHojaRemisionData(content, tables, keyValuePairs))
    } else if (tipoDocumento === 'nota_diplomatica') {
      Object.assign(extracted, this.extractNotaDiplomaticaData(content, tables, keyValuePairs))
    }

    return extracted
  }

  private static extractGuiaValijaData(content: string, tables?: any[], keyValuePairs?: any[]) {
    const extracted: any = {}

    // Buscar número de guía
    const guiaMatch = content.match(/(guía|guide)[\s\.-]*(\d{2,4}[-\/]\d{4})/i)
    if (guiaMatch) {
      extracted.numeroGuia = guiaMatch[2]
    }

    // Buscar fechas
    const dateMatches = content.match(/(\d{1,2}[/\-]\d{1,2}[/\-]\d{4}|\d{4}[/\-]\d{1,2}[/\-]\d{1,2})/g)
    if (dateMatches) {
      extracted.fechasEncontradas = dateMatches
    }

    // Extraer de keyValuePairs si existen
    if (keyValuePairs) {
      keyValuePairs.forEach(pair => {
        const key = (pair.key || '').toLowerCase()
        if (key.includes('número') || key.includes('numero') || key.includes('no')) {
          extracted.numeroGuia = pair.value
        }
        if (key.includes('fecha')) {
          extracted.fechaEmision = pair.value
        }
        if (key.includes('peso')) {
          extracted.peso = parseFloat(pair.value) || pair.value
        }
      })
    }

    return extracted
  }

  private static extractHojaRemisionData(content: string, tables?: any[], keyValuePairs?: any[]) {
    const extracted: any = {}

    // Extraer numero (numérico)
    const numeroMatch = content.match(/(?:n[úu]mero|no\s*\.?)\s*(\d+)/i)
    if (numeroMatch) {
      extracted.numero = parseInt(numeroMatch[1])
    }

    // Extraer siglaUnidad (2-4 letras mayúsculas)
    const siglaMatch = content.match(/\b([A-Z]{2,4})\b/)
    if (siglaMatch) {
      extracted.siglaUnidad = siglaMatch[1]
    }

    // Extraer para (destinatario)
    const paraMatch = content.match(/(?:para|a)\s*:\s*([^\n]+)/i)
    if (paraMatch) {
      extracted.para = paraMatch[1].trim()
    }

    // Extraer remitente
    const remitenteMatch = content.match(/(?:de|desde|remitente)\s*:\s*([^\n]+)/i)
    if (remitenteMatch) {
      extracted.remitente = remitenteMatch[1].trim()
    }

    // Extraer asunto
    const asuntoMatch = content.match(/(?:asunto|referencia)\s*:\s*([^\n]+)/i)
    if (asuntoMatch) {
      extracted.asunto = asuntoMatch[1].trim()
    }

    // Generar numeroCompleto
    if (extracted.numero) {
      extracted.numeroCompleto = `HR N°${extracted.numero}-${extracted.siglaUnidad || 'HH'}`
    }

    return extracted
  }

  private static extractNotaDiplomaticaData(content: string, tables?: any[], keyValuePairs?: any[]) {
    const extracted: any = {}

    // Buscar asunto o referencia
    const asuntoMatch = content.match(/(asunto|referencia|asunto:)[\s]+([^\n]+)/i)
    if (asuntoMatch) {
      extracted.asunto = asuntoMatch[2].trim()
    }

    // Buscar entidad emisora
    const entidadMatch = content.match(/(embajada|consulado|ministerio)[\s]+([^\n]+)/i)
    if (entidadMatch) {
      extracted.entidadEmisora = entidadMatch[0].trim()
    }

    return extracted
  }
}