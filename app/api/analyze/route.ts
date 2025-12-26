import { NextRequest, NextResponse } from "next/server"
import { analyzeDocument } from "@/lib/document-intelligence"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"

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
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    console.log(`Received file for analysis: ${file.name} (${file.size} bytes)`)

    const result = await analyzeDocument(file)

    // Save analysis results to database
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileExtension: file.name.split('.').pop() || '',
        contentText: result.content || null,
        pageCount: result.metadata.pageCount || null,
        language: result.metadata.languages?.[0] || null,
        tableCount: result.tables?.length || 0,
        keyValueCount: result.keyValuePairs?.length || 0,
        entityCount: result.entities?.length || 0,
        tables: result.tables || null,
        keyValuePairs: result.keyValuePairs || null,
        entities: result.entities || null,
        metadata: result.metadata || null,
        processingStatus: "completed",
      },
    })

    console.log(`Document saved to database with ID: ${document.id}`)

    return NextResponse.json({
      ...result,
      documentId: document.id,
    })
  } catch (error) {
    console.error("Document analysis error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to analyze document"
      },
      { status: 500 }
    )
  }
}