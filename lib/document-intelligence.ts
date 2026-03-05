import { AzureKeyCredential, DocumentAnalysisClient } from "@azure/ai-form-recognizer"

const isAzureConfigured = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT &&
                         process.env.AZURE_FORM_RECOGNIZER_KEY &&
                         process.env.AZURE_FORM_RECOGNIZER_ENDPOINT !== "your-azure-endpoint"

let client: DocumentAnalysisClient | null = null

if (isAzureConfigured) {
  try {
    client = new DocumentAnalysisClient(
      process.env.AZURE_FORM_RECOGNIZER_ENDPOINT!,
      new AzureKeyCredential(process.env.AZURE_FORM_RECOGNIZER_KEY!)
    )
  } catch (error) {
    console.error("Failed to initialize Azure client:", error)
  }
}

export interface DocumentAnalysisResult {
  content: string
  tables: any[]
  keyValuePairs: any[]
  entities: any[]
  metadata: any
}

async function analyzeDocumentWithAzure(file: File): Promise<DocumentAnalysisResult> {
  if (!client) {
    throw new Error("Azure Document Intelligence client not configured")
  }

  try {
    console.log(`→ Sending document to Azure Document Intelligence...`)
    const buffer = await file.arrayBuffer()
    const poller = await client.beginAnalyzeDocument("prebuilt-document", buffer)
    console.log(`→ Waiting for Azure analysis to complete...`)
    const result = await poller.pollUntilDone()
    console.log(`✓ Azure analysis completed successfully`)

    // Extract tables with detailed information
    const tables = result.tables ? result.tables.map((table: any, index: number) => {
      console.log(`→ Processing table ${index + 1}...`)
      return {
        rowCount: table.rowCount,
        columnCount: table.columnCount,
        cells: table.cells.map((cell: any) => ({
          kind: cell.kind,
          content: cell.content,
          rowIndex: cell.rowIndex,
          columnIndex: cell.columnIndex,
          confidence: cell.confidence
        }))
      }
    }) : []

    // Extract key-value pairs
    const keyValuePairs = result.keyValuePairs ? result.keyValuePairs.map((pair: any) => ({
      key: pair.key.content,
      value: pair.value ? pair.value.content : "",
      confidence: pair.confidence,
      boundingRegions: pair.boundingRegions
    })) : []

    // Extract entities with more details
    const entities = (result as any).entities ? (result as any).entities.map((entity: any) => ({
      category: entity.category,
      subCategory: entity.subCategory,
      content: entity.content,
      confidence: entity.confidence,
      boundingRegions: entity.boundingRegions
    })) : []

    // Extract additional metadata
    const metadata = {
      pageCount: result.pages ? result.pages.length : 1,
      title: file.name,
      languages: result.languages || [],
      styles: result.styles || []
    }

    return {
      content: result.content || "",
      tables,
      keyValuePairs,
      entities,
      metadata
    }
  } catch (error) {
    console.error("Azure analysis error:", error)
    throw new Error("Azure Document Intelligence analysis failed")
  }
}

export async function analyzeDocument(file: File): Promise<DocumentAnalysisResult> {
  if (!client) {
    throw new Error("Azure Document Intelligence client not configured. Please set AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY in your .env file.")
  }

  try {
    console.log(`Analyzing document: ${file.name}`)
    console.log("Using Azure Document Intelligence for real data extraction...")

    const result = await analyzeDocumentWithAzure(file)

    console.log(`✓ Extracted ${result.tables?.length || 0} tables`)
    console.log(`✓ Extracted ${result.keyValuePairs?.length || 0} key-value pairs`)
    console.log(`✓ Extracted ${result.entities?.length || 0} entities`)
    console.log(`✓ Document has ${result.metadata?.pageCount || 0} page(s)`)

    // 🔍 KEYS CAPTURADAS PARA GUÍA DE VALIJA
    console.log("\n════════════════════════════════════════════════════════════════")
    console.log("📋 JSON DE KEYS CAPTURADAS (GUÍA DE VALIJA):")
    console.log("════════════════════════════════════════════════════════════════")

    if (result.keyValuePairs && result.keyValuePairs.length > 0) {
      const keysMap = result.keyValuePairs.reduce((acc: any, pair: any) => {
        acc[pair.key] = pair.value
        return acc
      }, {})

      console.log(JSON.stringify(keysMap, null, 2))

      console.log("\n──────────────────────────────────────────────────────────────")
      console.log("📝 LISTADO DE KEYS INDIVIDUALES:")
      console.log("──────────────────────────────────────────────────────────────")
      result.keyValuePairs.forEach((pair: any, idx: number) => {
        console.log(`  ${idx + 1}. "${pair.key}" = "${pair.value}" (confianza: ${pair.confidence?.toFixed(2)})`)
      })
    } else {
      console.log("⚠️  No se detectaron pares clave-valor")
    }

    console.log("\n════════════════════════════════════════════════════════════════\n")

    return result
  } catch (error) {
    console.error("Document analysis failed:", error)
    throw new Error(`Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export function getSupportedFormats(): string[] {
  return [
    "pdf", "jpg", "jpeg", "png", "bmp", "tiff", "heif",
    "docx", "xlsx", "pptx", "html", "txt"
  ]
}