import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { processGuiaValijaFromAzure } from "@/lib/guias-valija-parser"

export const dynamic = 'force-dynamic'

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
    const { azureResult, fileName } = body

    if (!azureResult) {
      return NextResponse.json(
        { error: "azureResult is required" },
        { status: 400 }
      )
    }

    console.log("\n════════════════════════════════════════════════════════════════")
    console.log("📋 PROCESANDO GUÍA DE VALIJA:")
    console.log("════════════════════════════════════════════════════════════════")
    console.log(`Usuario: ${session.user.email}`)
    console.log(`Archivo: ${fileName}`)

    // Procesar y guardar la guía de valija
    const guia = await processGuiaValijaFromAzure(
      azureResult,
      session.user.id,
      fileName || "documento.pdf"
    )

    console.log(`✅ Guía de valija creada exitosamente`)
    console.log(`   Número: ${guia.numeroGuia}`)
    console.log(`   Destinatario: ${guia.destinatarioNombre}`)
    console.log(`   Items: ${guia.items?.length || 0}`)
    console.log(`   Precintos: ${guia.precintos?.length || 0}`)
    console.log("════════════════════════════════════════════════════════════════\n")

    return NextResponse.json({
      success: true,
      guia,
      message: "Guía de valija procesada exitosamente"
    })
  } catch (error) {
    console.error("Error processing Guía de Valija:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process Guía de Valija",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
