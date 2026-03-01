import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { shouldTrackView } from "@/lib/utils"
import { extractIpAddress, extractUserAgent } from "@/lib/services/file-audit.service"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Optional query: trackView=0 disables VIEW audit registration for technical reads.
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const trackView = shouldTrackView(req.url)
    const ipAddress = extractIpAddress(req)
    const userAgent = extractUserAgent(req)
    const oficio = await prisma.oficio.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      select: {
        id: true,
        numeroOficio: true,
        asunto: true,
        remitente: true,
        destinatario: true,
        referencia: true,
        contenidoTexto: true,
        metadata: true,
        sourceDocumentId: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!oficio) {
      return NextResponse.json({ error: "Oficio no encontrado" }, { status: 404 })
    }

    if (trackView) {
      // Non-blocking audit trail registration for explicit view reads.
      prisma.fileAuditLog.create({
        data: {
          userId: session.user.id,
          filePath: `OFICIO/${oficio.id}`,
          action: "VIEW",
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          documentType: "OFICIO",
          documentId: oficio.id,
          documentTitle: oficio.numeroOficio,
        },
      }).catch((auditError) => {
        logger.error("Failed to write oficio view audit log:", auditError)
      })
    }

    return NextResponse.json(oficio)
  } catch (error) {
    logger.error("Error fetching oficio:", error)
    return NextResponse.json({ error: "Failed to fetch oficio" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const ipAddress = extractIpAddress(req)
    const userAgent = extractUserAgent(req)
    const existing = await prisma.oficio.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Oficio no encontrado" }, { status: 404 })
    }

    const body = await req.json()
    const maybeNumero = typeof body?.numeroOficio === "string" ? body.numeroOficio.trim() : undefined
    if (typeof maybeNumero === "string" && !maybeNumero) {
      return NextResponse.json({ error: "numeroOficio no puede estar vacío" }, { status: 400 })
    }

    const payload = {
      ...(typeof maybeNumero === "string" ? { numeroOficio: maybeNumero } : {}),
      ...(typeof body?.asunto === "string" ? { asunto: body.asunto.trim() || null } : {}),
      ...(typeof body?.remitente === "string" ? { remitente: body.remitente.trim() || null } : {}),
      ...(typeof body?.destinatario === "string" ? { destinatario: body.destinatario.trim() || null } : {}),
      ...(typeof body?.referencia === "string" ? { referencia: body.referencia.trim() || null } : {}),
    }

    const oficio = await prisma.oficio.update({
      where: { id },
      data: payload,
      select: {
        id: true,
        numeroOficio: true,
        asunto: true,
        remitente: true,
        destinatario: true,
        referencia: true,
        sourceDocumentId: true,
        updatedAt: true,
      },
    })

    // Non-blocking audit trail registration.
    prisma.fileAuditLog.create({
      data: {
        userId: session.user.id,
        filePath: `OFICIO/${oficio.id}`,
        action: "UPDATE",
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        documentType: "OFICIO",
        documentId: oficio.id,
        documentTitle: oficio.numeroOficio,
      },
    }).catch((auditError) => {
      logger.error("Failed to write oficio update audit log:", auditError)
    })

    return NextResponse.json(oficio)
  } catch (error) {
    logger.error("Error updating oficio:", error)
    return NextResponse.json({ error: "Failed to update oficio" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const ipAddress = extractIpAddress(req)
    const userAgent = extractUserAgent(req)
    const existing = await prisma.oficio.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, numeroOficio: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Oficio no encontrado" }, { status: 404 })
    }

    await prisma.oficio.delete({
      where: { id: existing.id },
    })

    // Non-blocking audit trail registration.
    prisma.fileAuditLog.create({
      data: {
        userId: session.user.id,
        filePath: `OFICIO/${existing.id}`,
        action: "DELETE",
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        documentType: "OFICIO",
        documentId: existing.id,
        documentTitle: existing.numeroOficio,
      },
    }).catch((auditError) => {
      logger.error("Failed to write oficio delete audit log:", auditError)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("Error deleting oficio:", error)
    return NextResponse.json({ error: "Failed to delete oficio" }, { status: 500 })
  }
}
