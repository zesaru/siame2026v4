"use client"

import { useRouter } from "next/navigation"
import type { DocumentAnalysisResult } from "@/lib/document-intelligence"
import { GuiaValijaReviewPanel } from "@/components/documents/GuiaValijaReviewPanel"
import { toast } from "sonner"

interface DocumentResultsProps {
  result: DocumentAnalysisResult
  fileName: string
  fileUrl: string
  documentId?: string
}

export default function DocumentResults(props: DocumentResultsProps) {
  const router = useRouter()
  const { result, fileName, fileUrl, documentId } = props

  return (
    <GuiaValijaReviewPanel
      result={result}
      fileName={fileName}
      fileUrl={fileUrl}
      documentId={documentId}
      onSaveGuia={async (payload) => {
        const response = await fetch("/api/guias-valija/procesar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!response.ok) {
          return { error: data.error || "Error al guardar la guía de valija" }
        }

        return data
      }}
      onSaveSuccess={(data) => {
        toast.success(`Guía de valija guardada exitosamente. Nº: ${data.guia?.numeroGuia}`)
        router.push("/dashboard/guias-valija")
      }}
      onSaveError={(message) => {
        toast.error(message)
      }}
    />
  )
}
