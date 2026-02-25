import { DocumentAnalyzer } from "@/lib/document-analyzer"

export interface DocumentTypeAnalysisAdapter {
  analyze(content: string, tables: unknown, keyValuePairs: unknown): Promise<any>
}

export class DefaultDocumentTypeAnalysisAdapter implements DocumentTypeAnalysisAdapter {
  async analyze(content: string, tables: unknown, keyValuePairs: unknown) {
    return DocumentAnalyzer.analyze(content, tables as any, keyValuePairs as any)
  }
}
