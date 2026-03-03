export interface DocumentAnalysis {
  idioma: 'español' | 'ingles' | 'frances' | 'portugues'
  tipoDocumento: 'guia_valija' | 'hoja_remision' | 'oficio'
  direccion: 'entrada' | 'salida'
  confidence: {
    idioma: number
    tipoDocumento: number
    direccion: number
  }
  blocks: Array<{
    startPage: number
    endPage: number
    documentType: 'guia_valija' | 'hoja_remision' | 'oficio'
    confidence: number
  }>
  requiresManualReview: boolean
  reviewReason: string | null
  valijaClassification: {
    tipoValija: 'ENTRADA' | 'SALIDA' | null
    isExtraordinaria: boolean | null
  }
  extractedData: any
  keyIndicators: {
    languageKeywords: string[]
    documentTypeKeywords: string[]
    directionKeywords: string[]
  }
}

export class DocumentAnalyzer {
  private static extraordinaryMarkers = [
    /\bextraordinari[ao]s?\b/g,
    /\bservicio\s+extraordinari[ao]\b/g,
    /\bvalija\s+extraordinari[ao]\b/g,
    /\bgu[ií]a\s+extraordinari[ao]\b/g,
  ]

  private static ordinaryMarkers = [
    /\bordinari[ao]s?\b/g,
    /\bservicio\s+ordinari[ao]\b/g,
    /\bvalija\s+ordinari[ao]\b/g,
    /\bgu[ií]a\s+ordinari[ao]\b/g,
  ]

  private static extraordinaryNegations = [
    /\bno\s+extraordinari[ao]s?\b/g,
    /\bsin\s+(?:car[aá]cter\s+)?extraordinari[ao]s?\b/g,
  ]

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
    oficio: ['oficio', 'ofc', 'carta', 'oficial', 'señor', 'senor', 'de mi consideración', 'de mi consideracion']
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

    const pages = this.splitByPages(content || '')
    const blockAnalysis = this.detectDocumentBlocks(pages)
    const documentTypeAnalysis = this.detectDocumentTypeFromBlocks(blockAnalysis)

    // Detectar dirección
    const directionAnalysis = this.detectDirection(normalizedContent)
    const valijaClassification = this.detectValijaClassification(normalizedContent, directionAnalysis.direction)
    const reviewDecision = this.getReviewDecision(
      documentTypeAnalysis.confidence,
      directionAnalysis.confidence,
      blockAnalysis,
      documentTypeAnalysis.type,
      valijaClassification
    )

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
      blocks: blockAnalysis.blocks,
      requiresManualReview: reviewDecision.requiresManualReview,
      reviewReason: reviewDecision.reviewReason,
      valijaClassification,
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
    let detectedType: 'guia_valija' | 'hoja_remision' | 'oficio' = 'guia_valija'
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

  private static splitByPages(content: string): string[] {
    const chunks = content
      .split(/\f|(?:\n\s*page\s+\d+\s*(?:of\s+\d+)?\s*\n)/gi)
      .map((chunk) => chunk.trim())
      .filter(Boolean)

    return chunks.length > 0 ? chunks : [content]
  }

  private static scoreDocumentType(content: string) {
    const scores: Record<'guia_valija' | 'hoja_remision' | 'oficio', number> = {
      guia_valija: 0,
      hoja_remision: 0,
      oficio: 0,
    }

    Object.entries(this.documentTypeKeywords).forEach(([type, keywords]) => {
      let score = 0
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g')
        const matches = content.match(regex)
        if (matches) score += matches.length * 2
      }
      scores[type as keyof typeof scores] = score
    })

    return scores
  }

  private static detectDocumentBlocks(pages: string[]) {
    const pageTypes: Array<{ page: number; type: 'guia_valija' | 'hoja_remision' | 'oficio'; confidence: number }> = []
    for (let index = 0; index < pages.length; index++) {
      const normalized = pages[index].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const scores = this.scoreDocumentType(normalized)
      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
      const best = sorted[0]
      const second = sorted[1]
      const confidence = best[1] === 0 ? 0 : Math.min(best[1] / Math.max(1, best[1] + second[1]), 1)
      pageTypes.push({
        page: index + 1,
        type: best[0] as 'guia_valija' | 'hoja_remision' | 'oficio',
        confidence
      })
    }

    const blocks: Array<{ startPage: number; endPage: number; documentType: 'guia_valija' | 'hoja_remision' | 'oficio'; confidence: number }> = []
    for (const pageType of pageTypes) {
      const last = blocks[blocks.length - 1]
      if (last && last.documentType === pageType.type && last.endPage + 1 === pageType.page) {
        const blockSize = last.endPage - last.startPage + 1
        last.endPage = pageType.page
        last.confidence = ((last.confidence * blockSize) + pageType.confidence) / (blockSize + 1)
      } else {
        blocks.push({
          startPage: pageType.page,
          endPage: pageType.page,
          documentType: pageType.type,
          confidence: pageType.confidence
        })
      }
    }

    return { blocks, pageTypes }
  }

  private static detectDocumentTypeFromBlocks(blocksAnalysis: {
    blocks: Array<{ startPage: number; endPage: number; documentType: 'guia_valija' | 'hoja_remision' | 'oficio'; confidence: number }>
    pageTypes: Array<{ page: number; type: 'guia_valija' | 'hoja_remision' | 'oficio'; confidence: number }>
  }) {
    const weights: Record<'guia_valija' | 'hoja_remision' | 'oficio', number> = {
      guia_valija: 0,
      hoja_remision: 0,
      oficio: 0,
    }

    for (const block of blocksAnalysis.blocks) {
      const length = block.endPage - block.startPage + 1
      weights[block.documentType] += length * Math.max(block.confidence, 0.1)
    }

    const sorted = Object.entries(weights).sort((a, b) => b[1] - a[1])
    const bestType = sorted[0][0] as 'guia_valija' | 'hoja_remision' | 'oficio'
    const bestScore = sorted[0][1]
    const secondScore = sorted[1]?.[1] ?? 0
    const confidence = bestScore === 0 ? 0 : Math.min(bestScore / (bestScore + secondScore), 1)

    const foundKeywords = this.documentTypeKeywords[bestType]

    return {
      type: bestType,
      confidence,
      foundKeywords,
    }
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

  private static detectValijaClassification(content: string, direction: 'entrada' | 'salida') {
    const extraordinaryHits = this.extraordinaryMarkers.reduce((total, pattern) => {
      const matches = content.match(pattern)
      return total + (matches?.length || 0)
    }, 0)
    const ordinaryHits = this.ordinaryMarkers.reduce((total, pattern) => {
      const matches = content.match(pattern)
      return total + (matches?.length || 0)
    }, 0)
    const negatedExtraordinaryHits = this.extraordinaryNegations.reduce((total, pattern) => {
      const matches = content.match(pattern)
      return total + (matches?.length || 0)
    }, 0)

    let isExtraordinaria: boolean | null = false
    if (extraordinaryHits > 0 && ordinaryHits === 0 && negatedExtraordinaryHits === 0) {
      isExtraordinaria = true
    } else if (extraordinaryHits > 0 && (ordinaryHits > 0 || negatedExtraordinaryHits > 0)) {
      isExtraordinaria = null
    }

    return {
      tipoValija: direction === 'salida' ? 'SALIDA' : 'ENTRADA',
      isExtraordinaria,
    } as const
  }

  private static getReviewDecision(
    documentTypeConfidence: number,
    directionConfidence: number,
    blockAnalysis: {
      blocks: Array<{ startPage: number; endPage: number; documentType: 'guia_valija' | 'hoja_remision' | 'oficio'; confidence: number }>
    },
    detectedType: 'guia_valija' | 'hoja_remision' | 'oficio',
    valijaClassification: { tipoValija: 'ENTRADA' | 'SALIDA' | null; isExtraordinaria: boolean | null }
  ) {
    const threshold = 0.7
    if (documentTypeConfidence < threshold) {
      return { requiresManualReview: true, reviewReason: 'Low document type confidence' }
    }
    if (detectedType === 'guia_valija' && valijaClassification.isExtraordinaria === null) {
      return { requiresManualReview: true, reviewReason: 'Ambiguous valija extraordinary classification' }
    }
    if (directionConfidence < 0.6) {
      return { requiresManualReview: true, reviewReason: 'Low direction confidence' }
    }
    if (blockAnalysis.blocks.length > 1) {
      return { requiresManualReview: true, reviewReason: 'Mixed document types across pages' }
    }
    return { requiresManualReview: false, reviewReason: null }
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
    } else if (tipoDocumento === 'oficio') {
      Object.assign(extracted, this.extractOficioData(content, tables, keyValuePairs))
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

  private static extractOficioData(content: string, tables?: any[], keyValuePairs?: any[]) {
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
