"use client"

import React, { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface UploadResult {
  documentId: string
  specificRecordType: string
  analysis: {
    idioma: string
    tipoDocumento: string
    direccion: string
    confidence: {
      idioma: number
      tipoDocumento: number
      direccion: number
    }
  }
}

interface SmartDocumentUploadProps {
  onUploadComplete?: (result: UploadResult) => void
  onError?: (error: string) => void
}

export function SmartDocumentUpload({ onUploadComplete, onError }: SmartDocumentUploadProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)
    setUploadedFile(file)
    setUploadProgress(10)

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Simular progreso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch("/api/analyze/document-type", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al analizar el documento")
      }

      const result: UploadResult = await response.json()

      toast.success(`Documento analizado: ${result.analysis.tipoDocumento} - ${result.analysis.direccion}`)

      // Redirigir a página de verificación
      router.push(`/verify?documentId=${result.documentId}`)

      onUploadComplete?.(result)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast.error(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      setUploadedFile(null)
    }
  }, [router, onUploadComplete, onError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"]
    },
    maxFiles: 1,
    disabled: isUploading
  })

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Subir Documento Inteligente
        </CardTitle>
        <CardDescription>
          Nuestro sistema analizará automáticamente tu documento para detectar:
          <br />
          <span className="font-medium">1. Idioma • 2. Tipo de Documento • 3. Dirección (Entrada/Salida)</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive
              ? "border-[var(--kt-primary)] bg-[var(--kt-primary-light)]"
              : "border-[var(--kt-gray-300)] hover:border-[var(--kt-primary)]"
            }
            ${isUploading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 text-[var(--kt-primary)] animate-spin mx-auto" />
              <div>
                <p className="font-medium text-[var(--kt-text-dark)]">Analizando documento...</p>
                <Progress value={uploadProgress} className="mt-2" />
              </div>
              {uploadedFile && (
                <p className="text-sm text-[var(--kt-text-muted)]">
                  Archivo: {uploadedFile.name}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-[var(--kt-gray-400)] mx-auto" />
              {isDragActive ? (
                <p className="text-[var(--kt-primary)] font-medium">
                  Suelta el archivo para subir...
                </p>
              ) : (
                <div>
                  <p className="font-medium text-[var(--kt-text-dark)]">
                    Arrastra y suelta un documento aquí
                  </p>
                  <p className="text-sm text-[var(--kt-text-muted)] mt-1">
                    o haz clic para seleccionar
                  </p>
                </div>
              )}
              <p className="text-xs text-[var(--kt-text-muted)]">
                Formatos soportados: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG
              </p>
            </div>
          )}
        </div>

        {/* Supported Formats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>PDF</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>DOC/DOCX</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>XLS/XLSX</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>Imágenes</span>
          </div>
        </div>

        {/* Features Info */}
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Inteligencia Artificial:</strong> Nuestro sistema detectará automáticamente
            el idioma, tipo de documento y dirección (entrada/salida) para ayudarte
            a completar el formulario correcto.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}