import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

// GET - Listar todas las guías del usuario
export async function GET() {
  const session = await auth()

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const guias = await prisma.guiaValija.findMany({
      where: { userId: session.user.id },
      include: {
        items: true,
        precintos: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(guias)
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

    // Validar número de guía único
    const existing = await prisma.guiaValija.findUnique({
      where: { numeroGuia: body.numeroGuia },
    })

    if (existing) {
      return NextResponse.json({ error: "El número de guía ya existe" }, { status: 400 })
    }

    // Crear la guía
    const guia = await prisma.guiaValija.create({
      data: {
        userId: session.user.id,
        numeroGuia: body.numeroGuia,
        tipoValija: body.tipoValija,
        fechaEmision: body.fechaEmision ? new Date(body.fechaEmision) : new Date(),
        fechaEnvio: body.fechaEnvio ? new Date(body.fechaEnvio) : null,
        fechaRecibo: body.fechaRecibo ? new Date(body.fechaRecibo) : null,
        origenCiudad: body.origenCiudad,
        destinoCiudad: body.destinoCiudad,
        origenPais: body.origenPais,
        destinoPais: body.destinoPais,
        remitenteNombre: body.remitenteNombre,
        remitenteCargo: body.remitenteCargo,
        remitenteEmail: body.remitenteEmail,
        destinatarioNombre: body.destinatarioNombre,
        destinatarioCargo: body.destinatarioCargo,
        destinatarioEmail: body.destinatarioEmail,
        pesoValija: body.pesoValija ? parseFloat(body.pesoValija) : null,
        pesoOficial: body.pesoOficial ? parseFloat(body.pesoOficial) : null,
        numeroPaquetes: body.numeroPaquetes ? parseInt(body.numeroPaquetes) : null,
        descripcionContenido: body.descripcionContenido,
        observaciones: body.observaciones,
        preparadoPor: body.preparadoPor,
        revisadoPor: body.revisadoPor,
        firmaReceptor: body.firmaReceptor,
        estado: body.estado || "pendiente",
        processingStatus: "completed",
      },
    })

    // Agregar items si existen
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      await prisma.guiaValijaItem.createMany({
        data: body.items.map((item: any) => ({
          guiaValijaId: guia.id,
          numeroItem: item.numeroItem || 0,
          destinatario: item.destinatario || '',
          contenido: item.contenido || '',
          remitente: item.remitente || null,
          cantidad: item.cantidad || null,
          peso: item.peso || null,
        })),
      })
    }

    // Obtener la guía con items incluidos
    const guiaConItems = await prisma.guiaValija.findUnique({
      where: { id: guia.id },
      include: {
        items: true,
        precintos: true,
      },
    })

    return NextResponse.json(guiaConItems, { status: 201 })
  } catch (error) {
    console.error("Error creating guia:", error)
    return NextResponse.json({ error: "Error creating guia" }, { status: 500 })
  }
}
