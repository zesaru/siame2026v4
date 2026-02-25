import { ApplicationError } from "@/lib/shared/errors"
import { err, ok, type Result } from "@/lib/shared/result"
import type { HojaRemisionAnalysisAdapter } from "../../infrastructure/analysis/azure-hoja-remision-analyzer"

export interface AnalyzeHojaRemisionFileResult {
  success: true
  azureResult: unknown
  extractedData: unknown
}

export class AnalyzeHojaRemisionFileUseCase {
  constructor(private readonly analyzer: HojaRemisionAnalysisAdapter) {}

  async execute(file: File | null | undefined): Promise<Result<AnalyzeHojaRemisionFileResult, ApplicationError>> {
    if (!file) {
      return err(new ApplicationError("HOJA_REMISION_ANALYZE_FILE_REQUIRED", "No file provided"))
    }

    try {
      const { azureResult, extractedData } = await this.analyzer.analyze(file)
      return ok({ success: true, azureResult, extractedData })
    } catch (cause) {
      return err(new ApplicationError("HOJA_REMISION_ANALYZE_FAILED", "Failed to analyze Hoja de Remisión", cause))
    }
  }
}
