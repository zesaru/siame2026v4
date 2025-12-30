"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import DocumentUpload from "@/components/DocumentUpload"
import HojaRemisionForm, {
  type HojaRemisionFormData,
} from "@/components/dashboard/HojaRemisionForm"
import { toast } from "sonner"
import { createHojaRemision } from "@/app/dashboard/hojas-remision/actions"
import type { ParsedHojaRemisionData } from "@/lib/hojas-remision-parser"

type UploadState =
  | "idle"
  | "uploading"
  | "analyzing"
  | "editing"
  | "saving"
  | "success"
  | "error"

interface HojaRemisionUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function HojaRemisionUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: HojaRemisionUploadDialogProps) {
  const [state, setState] = useState<UploadState>("idle")
  const [extractedData, setExtractedData] =
    useState<ParsedHojaRemisionData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalysisComplete = async (result: any, file: File) => {
    try {
      setState("analyzing")

      // Enviar a endpoint específico de hoja de remisión
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/analyze/hoja-remision", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error analyzing document")
      }

      const { extractedData } = await response.json()

      setExtractedData(extractedData)
      setState("editing")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setState("error")
    }
  }

  const handleSave = async (formData: HojaRemisionFormData) => {
    try {
      setState("saving")

      const result = await createHojaRemision(formData)

      if (!result.success) {
        throw new Error(result.error || "Error saving")
      }

      setState("success")
      toast.success("Hoja de Remisión creada exitosamente")
      onSuccess?.()
      onOpenChange(false)

      // Reset state after dialog closes
      setTimeout(() => {
        setState("idle")
        setExtractedData(null)
        setError(null)
      }, 200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
      setState("editing")
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // Reset state after dialog closes
    setTimeout(() => {
      setState("idle")
      setExtractedData(null)
      setError(null)
    }, 200)
  }

  const handleRetry = () => {
    setError(null)
    setState("idle")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {state === "idle" && "Subir Hoja de Remisión"}
            {(state === "uploading" || state === "analyzing") &&
              "Procesando documento..."}
            {state === "editing" && "Verificar datos extraídos"}
            {state === "saving" && "Guardando..."}
            {state === "error" && "Error"}
          </DialogTitle>
          <DialogDescription>
            {state === "idle" &&
              "Sube un PDF para extraer automáticamente los datos"}
            {state === "editing" &&
              "Verifica y corrige los datos extraídos antes de guardar"}
          </DialogDescription>
        </DialogHeader>

        {state === "idle" && (
          <DocumentUpload
            onAnalysisComplete={handleAnalysisComplete}
            onError={(err) => {
              setError(err)
              setState("error")
            }}
          />
        )}

        {state === "editing" && extractedData && (
          <HojaRemisionForm
            initialData={extractedData}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}

        {state === "error" && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRetry}>Intentar de nuevo</Button>
          </div>
        )}

        {(state === "uploading" || state === "analyzing" || state === "saving") && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">
                {state === "uploading" && "Subiendo archivo..."}
                {state === "analyzing" &&
                  "Analizando documento con Azure AI..."}
                {state === "saving" && "Guardando en base de datos..."}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
