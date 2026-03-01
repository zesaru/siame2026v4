import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized - Authentication required" },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const documentId = body?.documentId as string | undefined
    const reason = (body?.reason as string | undefined)?.trim()

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ error: "reason is required" }, { status: 400 })
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId, userId: session.user.id },
      select: { id: true, metadata: true },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const metadata = (document.metadata || {}) as Record<string, any>
    await prisma.document.update({
      where: { id: document.id },
      data: {
        processingStatus: "failed",
        errorMessage: reason,
        metadata: {
          ...metadata,
          reviewedAt: new Date().toISOString(),
          reviewedBy: session.user.id,
          rejectedAt: new Date().toISOString(),
          rejectedBy: session.user.id,
          rejectionReason: reason,
          reviewStatus: "rejected",
        },
      },
    })

    return NextResponse.json({
      success: true,
      documentId: document.id,
      status: "rejected",
      reason,
    })
  } catch (error) {
    logger.error("Document reject error", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to reject document analysis",
      },
      { status: 500 }
    )
  }
}
