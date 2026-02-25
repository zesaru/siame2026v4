import { analyzeDocument } from "@/lib/document-intelligence"
import { parseHojaRemisionFromAzure } from "@/lib/hojas-remision-parser"

export interface HojaRemisionAnalysisAdapter {
  analyze(file: File): Promise<{ azureResult: unknown; extractedData: unknown }>
}

export class AzureHojaRemisionAnalysisAdapter implements HojaRemisionAnalysisAdapter {
  async analyze(file: File) {
    const azureResult = await analyzeDocument(file)
    const extractedData = await parseHojaRemisionFromAzure(azureResult as any)
    return { azureResult, extractedData }
  }
}
