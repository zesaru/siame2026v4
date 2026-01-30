import { NextRequest, NextResponse } from "next/server"
import { analyzeDocument } from "@/lib/document-intelligence"
import { parseHojaRemisionFromAzure } from "@/lib/hojas-remision-parser"
import { auth } from "@/lib/auth-v4"

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

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    console.log(`\n📄 Analyzing Hoja de Remisión: ${file.name}`)

    // 1. Analizar documento con Azure AI
    const azureResult = await analyzeDocument(file)

    // 2. Parsear datos específicos de Hoja de Remisión
    const extractedData = await parseHojaRemisionFromAzure(azureResult)

    console.log(`✅ Hoja de Remisión analysis completed\n`)

    return NextResponse.json({
      success: true,
      azureResult,
      extractedData,
    })
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
