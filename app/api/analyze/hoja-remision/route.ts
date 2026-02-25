import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { AnalyzeHojaRemisionFileUseCase } from "@/modules/hojas-remision/application/use-cases"
import { AzureHojaRemisionAnalysisAdapter } from "@/modules/hojas-remision/infrastructure"

// POST mutations don't need force-dynamic (never cached anyway)

export async function POST(req: NextRequest) {
  // Verify authentication
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized - Authentication required" },
      { status: 401 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    const useCase = new AnalyzeHojaRemisionFileUseCase(new AzureHojaRemisionAnalysisAdapter())
    const result = await useCase.execute(file)

    if (!result.ok) {
      if (result.error.code === "HOJA_REMISION_ANALYZE_FILE_REQUIRED") {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        )
      }

      console.error("❌ Hoja de Remisión analysis error:", result.error.details ?? result.error)
      return NextResponse.json(
        {
          error: "Failed to analyze Hoja de Remisión"
        },
        { status: 500 }
      )
    }

    console.log(`\n📄 Analyzing Hoja de Remisión: ${file.name}`)
    console.log(`✅ Hoja de Remisión analysis completed\n`)

    return NextResponse.json(result.value)
  } catch (error) {
    console.error("❌ Hoja de Remisión analysis error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze Hoja de Remisión"
      },
      { status: 500 }
    )
  }
}
