import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"

export const dynamic = 'force-dynamic'

// GET /api/documents/[id] - Get a specific document
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    )
  }
}

// DELETE /api/documents/[id] - Delete a specific document
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    // Verify user owns the document
    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    // Delete the document
    await prisma.document.delete({
      where: { id: params.id },
    })

    console.log(`Document deleted: ${params.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    )
  }
}

// PUT /api/documents/[id] - Update document key-value pairs
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const { keyValuePairs } = body

    // Validate input
    if (!Array.isArray(keyValuePairs)) {
      return NextResponse.json(
        { error: "keyValuePairs must be an array" },
        { status: 400 }
      )
    }

    // Verify ownership
    const document = await prisma.document.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    // Update document
    const updated = await prisma.document.update({
      where: { id: params.id },
      data: {
        keyValuePairs,
        keyValueCount: keyValuePairs.length,
        updatedAt: new Date(),
      },
    })

    console.log(`Document ${params.id} updated with ${keyValuePairs.length} key-value pairs`)

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    )
  }
}
