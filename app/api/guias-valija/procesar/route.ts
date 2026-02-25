import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { logger } from "@/lib/logger"
import { ProcessGuiaValijaFromAzureUseCase } from "@/modules/guias-valija/application/use-cases"

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
    const body = await req.json()
    const { azureResult, fileName, documentId } = body

    const useCase = new ProcessGuiaValijaFromAzureUseCase()
    const result = await useCase.execute({
      userId: session.user.id,
      userEmail: session.user.email,
      azureResult,
      fileName,
      documentId,
    })

    if (!result.ok) {
      if (result.error.code === "GUIA_AZURE_RESULT_REQUIRED") {
        return NextResponse.json({ error: result.error.message }, { status: 400 })
      }
      throw result.error.details ?? result.error
    }

    return NextResponse.json(result.value)
  } catch (error) {
    logger.error("Error processing Guía de Valija", error)
    logger.separator()
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process Guía de Valija",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
