import { analyzeDocument } from "@/lib/document-intelligence"

export interface AzureDocumentAnalysisAdapter {
  analyze(file: File): Promise<any>
}

export class DefaultAzureDocumentAnalysisAdapter implements AzureDocumentAnalysisAdapter {
  async analyze(file: File) {
    return analyzeDocument(file)
  }
}
