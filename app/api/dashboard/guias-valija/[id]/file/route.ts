import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { fileStorageService } from "@/lib/services/file-storage.service"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const guia = await prisma.guiaValija.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, filePath: true },
    })

    if (!guia) {
      return NextResponse.json({ error: "Guía no encontrada" }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo PDF requerido" }, { status: 400 })
    }

    const isPdfByType = file.type === "application/pdf"
    const isPdfByName = file.name.toLowerCase().endsWith(".pdf")
    if (!isPdfByType && !isPdfByName) {
      return NextResponse.json({ error: "Solo se permite archivo PDF" }, { status: 400 })
    }

    const saveResult = await fileStorageService.saveFile({
      entityType: "GUIAENTRADA",
      entityId: guia.id,
      file,
      date: new Date(),
    })

    if (!saveResult.success || !saveResult.relativePath) {
      return NextResponse.json(
        { error: saveResult.error || "No se pudo guardar el archivo PDF" },
        { status: 400 },
      )
    }

    try {
      await prisma.guiaValija.update({
        where: { id: guia.id },
        data: {
          filePath: saveResult.relativePath,
          fileHash: saveResult.fileHash,
          fileMimeType: saveResult.fileMimeType || "application/pdf",
        },
      })
    } catch (updateError: any) {
      if (updateError.code === "P2002" && updateError.meta?.target?.includes("fileHash")) {
        await prisma.guiaValija.update({
          where: { id: guia.id },
          data: {
            filePath: saveResult.relativePath,
            fileMimeType: saveResult.fileMimeType || "application/pdf",
          },
        })
      } else {
        throw updateError
      }
    }

    if (guia.filePath && guia.filePath !== saveResult.relativePath) {
      await fileStorageService.deleteFile(guia.filePath)
    }

    return NextResponse.json({
      success: true,
      filePath: saveResult.relativePath,
      fileMimeType: saveResult.fileMimeType || "application/pdf",
    })
  } catch (error) {
    console.error("Error subiendo PDF de guía de valija:", error)
    return NextResponse.json({ error: "Error al subir PDF" }, { status: 500 })
  }
}
