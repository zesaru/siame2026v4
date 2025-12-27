import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { processGuiaValijaFromAzure } from "@/lib/guias-valija-parser"
import { logger } from "@/lib/logger"

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

    logger.separator()
    logger.document('GUÍA DE VALIJA - PROCESSING STARTED', fileName || 'documento.pdf')
    logger.info(`Usuario: ${session.user.email}`)

    // Log de los key-value pairs recibidos
    logger.azureKeyValuePairs(azureResult.keyValuePairs)

    // Procesar y guardar la guía de valija
    const guia = await processGuiaValijaFromAzure(
      azureResult,
      session.user.id,
      fileName || "documento.pdf"
    )

    logger.separator('═', 60)
    logger.success('GUÍA DE VALIJA CREADA EXITOSAMENTE')
    console.log(`   Nº Guía:        ${guia.numeroGuia}`)
    console.log(`   Destinatario:   ${guia.destinatarioNombre}`)
    console.log(`   Remitente:      ${guia.remitenteNombre}`)
    console.log(`   Tipo:           ${guia.tipoValija}`)
    console.log(`   Origen:         ${guia.origenCiudad} (${guia.origenPais})`)
    console.log(`   Destino:        ${guia.destinoCiudad} (${guia.destinoPais})`)
    console.log(`   Fecha Envío:    ${guia.fechaEnvio ? guia.fechaEnvio.toLocaleDateString() : 'N/A'}`)
    console.log(`   Peso Valija:    ${guia.pesoValija || 'N/A'} Kgrs.`)
    console.log(`   Peso Oficial:   ${guia.pesoOficial || 'N/A'} Kgrs.`)
    console.log(`   Items:          ${guia.items?.length || 0}`)
    console.log(`   Precintos:      ${guia.precintos?.length || 0}`)
    logger.separator('═', 60)

    return NextResponse.json({
      success: true,
      guia,
      message: "Guía de valija procesada exitosamente"
    })
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
