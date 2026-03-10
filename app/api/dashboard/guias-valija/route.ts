import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { ListGuiasValijaByUserUseCase } from "@/modules/guias-valija/application/queries"
import { CreateGuiaValijaForUserUseCase } from "@/modules/guias-valija/application/use-cases"
import { toGuiaValijaDetailDto, toGuiaValijaListDto } from "@/modules/guias-valija/application/mappers"
import { parseCreateGuiaValijaCommand } from "@/modules/guias-valija/application/validation"
import { PrismaGuiaValijaRepository } from "@/modules/guias-valija/infrastructure"

// Revalidate guías list every 60 seconds (moderately frequent updates)
export const revalidate = 60

// GET - Listar todas las guías del usuario
export async function GET() {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const value = await prisma.guiaValija.findMany({
      select: {
        id: true,
        numeroGuia: true,
        fechaEmision: true,
        tipoValija: true,
        isExtraordinaria: true,
        fechaEnvio: true,
        fechaRecibo: true,
        origenCiudad: true,
        destinoCiudad: true,
        origenPais: true,
        destinoPais: true,
        destinatarioNombre: true,
        remitenteNombre: true,
        pesoValija: true,
        numeroPaquetes: true,
        estado: true,
        processingStatus: true,
        filePath: true,
        fileMimeType: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            numeroItem: true,
            destinatario: true,
            contenido: true,
            remitente: true,
            cantidad: true,
            peso: true,
          },
        },
        precintos: {
          select: {
            id: true,
            precinto: true,
            precintoCable: true,
            numeroBolsaTamano: true,
            guiaAereaNumero: true,
          },
        },
        _count: { select: { items: true, precintos: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    const result = { ok: true as const, value }

    if (!result.ok) {
      console.error("Error fetching guias:", result.error)
      return NextResponse.json({ error: "Error fetching guias" }, { status: 500 })
    }

    return NextResponse.json(toGuiaValijaListDto(result.value))
  } catch (error) {
    console.error("Error fetching guias:", error)
    return NextResponse.json({ error: "Error fetching guias" }, { status: 500 })
  }
}

// POST - Crear nueva guía
export async function POST(req: Request) {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsedBody = parseCreateGuiaValijaCommand(body)

    if (!parsedBody.ok) {
      return NextResponse.json(
        { error: "Datos inválidos para crear guía", details: parsedBody.error.details },
        { status: 400 },
      )
    }

    const repository = new PrismaGuiaValijaRepository(prisma)
    const useCase = new CreateGuiaValijaForUserUseCase(repository)
    const result = await useCase.execute({
      userId: session.user.id,
      data: parsedBody.value,
    })

    if (!result.ok) {
      console.error("Error creating guia:", result.error)
      return NextResponse.json({ error: "Error creating guia" }, { status: 500 })
    }

    if (result.value.status === "duplicate_numero_guia") {
      return NextResponse.json({ error: "El número de guía ya existe" }, { status: 400 })
    }

    return NextResponse.json(toGuiaValijaDetailDto(result.value.guia), { status: 201 })
  } catch (error) {
    console.error("Error creating guia:", error)
    return NextResponse.json({ error: "Error creating guia" }, { status: 500 })
  }
}
