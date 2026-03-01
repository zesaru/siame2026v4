"use client"

import { useEffect, useState, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, Edit, FileText, MapPin, Globe } from "lucide-react"
import { toast } from "sonner"

interface AnalysisResult {
  documentId: string
  specificRecordId: string
  specificRecordType: string
  classificationVersion?: string
  analysis: {
    idioma: string
    tipoDocumento: string
    direccion: string
    confidence: {
      idioma: number
      tipoDocumento: number
      direccion: number
    }
    extractedData: any
    keyIndicators: {
      languageKeywords: string[]
      documentTypeKeywords: string[]
      directionKeywords: string[]
    }
    blocks?: Array<{
      startPage: number
      endPage: number
      documentType: string
      confidence: number
    }>
    requiresManualReview?: boolean
    reviewReason?: string | null
    valijaClassification?: {
      tipoValija: 'ENTRADA' | 'SALIDA' | null
      isExtraordinaria: boolean | null
    }
  }
  recommendation: {
    title: string
    description: string
    formPath: string
    action?: string
  }
}

interface ConfirmResponse {
  success: boolean
  documentId: string
  recordId: string | null
  recordType: string
  alreadyConfirmed: boolean
  requiresManualReview?: boolean
  reviewReason?: string | null
  error?: string
}

interface AnalysisOverrides {
  extractedData: Record<string, any>
  valijaClassification: {
    tipoValija: "ENTRADA" | "SALIDA"
    isExtraordinaria: boolean
  }
}

function VerifyDocumentContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentId = searchParams?.get('documentId')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("Clasificación incorrecta")
  const [overrides, setOverrides] = useState<AnalysisOverrides>({
    extractedData: {},
    valijaClassification: { tipoValija: "ENTRADA", isExtraordinaria: false },
  })

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/auth/signin")
      return
    }
    if (documentId) {
      fetchAnalysis(documentId)
    }
  }, [session, status, documentId])

  const fetchAnalysis = async (id: string) => {
    try {
      const response = await fetch(`/api/analyze/document-type?documentId=${id}`)
      if (!response.ok) throw new Error("Error al cargar el análisis")

      const data = await response.json()
      setAnalysis(data)
      setOverrides({
        extractedData: { ...(data.analysis?.extractedData || {}) },
        valijaClassification: {
          tipoValija: data.analysis?.valijaClassification?.tipoValija === "SALIDA" ? "SALIDA" : "ENTRADA",
          isExtraordinaria: Boolean(data.analysis?.valijaClassification?.isExtraordinaria),
        },
      })
    } catch (error) {
      toast.error("Error al cargar el análisis del documento")
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!analysis) return

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/analyze/document-type/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: analysis.documentId,
          overrides: isEditing ? overrides : undefined,
        }),
      })

      const data: ConfirmResponse = await response.json()
      if (!response.ok) {
        if (data.requiresManualReview) {
          toast.error(data.reviewReason || "Este documento requiere revisión manual antes de confirmar.")
          return
        }
        throw new Error(data.error || "No se pudo confirmar el documento")
      }

      toast.success(data.alreadyConfirmed ? "Documento ya estaba confirmado" : "Documento confirmado")

      if (data.recordType === "guia_valija" && data.recordId) {
        router.push(`/guias-valija/${data.recordId}/view`)
        return
      }

      if (data.recordType === "hoja_remision" && data.recordId) {
        router.push(`/dashboard/hojas-remision/${data.recordId}/view`)
        return
      }

      if (data.recordType === "oficio" && data.recordId) {
        router.push(`/dashboard/oficios/${data.recordId}/view`)
        return
      }

      const params = new URLSearchParams({
        preFilled: "true",
        documentId: analysis.documentId,
        tipoDocumento: analysis.analysis.tipoDocumento,
        direccion: analysis.analysis.direccion,
        idioma: analysis.analysis.idioma,
      })
      router.push(`${analysis.recommendation.formPath}?${params.toString()}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al confirmar")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!analysis) return

    const reason = rejectReason.trim()
    if (!reason) {
      toast.error("Debes ingresar un motivo de rechazo")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/analyze/document-type/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: analysis.documentId,
          reason,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "No se pudo rechazar el análisis")
      }

      toast.success("Análisis marcado como rechazado")
      closeRejectDialog()
      router.push("/dashboard/documents")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al rechazar")
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeRejectDialog = () => {
    setIsRejectDialogOpen(false)
    setRejectReason("Clasificación incorrecta")
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (!analysis) return
    setOverrides({
      extractedData: { ...(analysis.analysis?.extractedData || {}) },
      valijaClassification: {
        tipoValija: analysis.analysis?.valijaClassification?.tipoValija === "SALIDA" ? "SALIDA" : "ENTRADA",
        isExtraordinaria: Boolean(analysis.analysis?.valijaClassification?.isExtraordinaria),
      },
    })
    setIsEditing(false)
  }

  const setExtractedField = (field: string, value: string) => {
    setOverrides((prev) => ({
      ...prev,
      extractedData: {
        ...prev.extractedData,
        [field]: value,
      },
    }))
  }

  const handleRecalculate = () => {
    if (!documentId) return
    setLoading(true)
    fetchAnalysis(documentId)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return "Alta"
    if (confidence >= 0.6) return "Media"
    return "Baja"
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--kt-text-muted)]">Analizando documento...</p>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-[var(--kt-text-dark)] mb-2">Análisis no encontrado</h2>
        <p className="text-[var(--kt-text-muted)] mb-4">No se pudo cargar el análisis del documento</p>
        <Button onClick={() => router.back()}>
          Volver atrás
        </Button>
      </div>
    )
  }

  const { analysis: analysisData, recommendation } = analysis

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--kt-text-dark)] mb-2">
          Verificar Análisis de Documento
        </h1>
        <p className="text-[var(--kt-text-muted)]">
          Revisa los resultados del análisis automático y confirma o corrige los datos
        </p>
      </div>

      {/* Analysis Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--kt-primary)]" />
            Resultados del Análisis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Detection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-[var(--kt-gray-50)] rounded-lg">
              <Globe className="h-8 w-8 text-[var(--kt-info)] mx-auto mb-2" />
              <p className="text-sm text-[var(--kt-text-muted)] mb-1">Idioma</p>
              <p className="font-semibold text-lg">{analysisData.idioma}</p>
              <p className={`text-xs ${getConfidenceColor(analysisData.confidence.idioma)}`}>
                Confianza: {getConfidenceText(analysisData.confidence.idioma)}
              </p>
            </div>

            <div className="text-center p-4 bg-[var(--kt-gray-50)] rounded-lg">
              <FileText className="h-8 w-8 text-[var(--kt-primary)] mx-auto mb-2" />
              <p className="text-sm text-[var(--kt-text-muted)] mb-1">Tipo de Documento</p>
              <p className="font-semibold text-lg capitalize">{analysisData.tipoDocumento.replace('_', ' ')}</p>
              <p className={`text-xs ${getConfidenceColor(analysisData.confidence.tipoDocumento)}`}>
                Confianza: {getConfidenceText(analysisData.confidence.tipoDocumento)}
              </p>
            </div>

            <div className="text-center p-4 bg-[var(--kt-gray-50)] rounded-lg">
              <MapPin className="h-8 w-8 text-[var(--kt-warning)] mx-auto mb-2" />
              <p className="text-sm text-[var(--kt-text-muted)] mb-1">Dirección</p>
              <p className="font-semibold text-lg capitalize">{analysisData.direccion}</p>
              <p className={`text-xs ${getConfidenceColor(analysisData.confidence.direccion)}`}>
                Confianza: {getConfidenceText(analysisData.confidence.direccion)}
              </p>
            </div>
          </div>

          {/* Average Confidence */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-[var(--kt-text-muted)]">Confianza General:</span>
            <Badge
              className={
                Math.round((analysisData.confidence.idioma + analysisData.confidence.tipoDocumento + analysisData.confidence.direccion) / 3 * 100) >= 80
                  ? "bg-green-100 text-green-700"
                  : Math.round((analysisData.confidence.idioma + analysisData.confidence.tipoDocumento + analysisData.confidence.direccion) / 3 * 100) >= 60
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
              }
            >
              {Math.round((analysisData.confidence.idioma + analysisData.confidence.tipoDocumento + analysisData.confidence.direccion) / 3 * 100)}%
            </Badge>
          </div>

          {analysisData.requiresManualReview && (
            <Alert className="border-yellow-300 bg-yellow-50">
              <AlertDescription>
                Revisión manual requerida: {analysisData.reviewReason || "Se detectó ambigüedad en la clasificación."}
              </AlertDescription>
            </Alert>
          )}

          {analysisData.tipoDocumento === "guia_valija" && analysisData.valijaClassification && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-[var(--kt-gray-50)] rounded-lg">
                <p className="text-sm text-[var(--kt-text-muted)]">Tipo de Valija</p>
                <p className="font-semibold">{analysisData.valijaClassification.tipoValija || "No detectado"}</p>
              </div>
              <div className="p-3 bg-[var(--kt-gray-50)] rounded-lg">
                <p className="text-sm text-[var(--kt-text-muted)]">Extraordinaria</p>
                <p className="font-semibold">{analysisData.valijaClassification.isExtraordinaria ? "Sí" : "No"}</p>
              </div>
            </div>
          )}

          {!!analysisData.blocks?.length && (
            <div>
              <p className="font-medium text-[var(--kt-text-dark)] mb-2">Bloques detectados por páginas:</p>
              <div className="space-y-2">
                {analysisData.blocks.map((block, idx) => (
                  <div key={`${block.startPage}-${block.endPage}-${idx}`} className="flex justify-between rounded-md border p-2 text-sm">
                    <span>
                      Pág. {block.startPage}
                      {block.endPage > block.startPage ? `-${block.endPage}` : ""}:
                      {" "}
                      <strong>{block.documentType.replace("_", " ")}</strong>
                    </span>
                    <span>{Math.round(block.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords Found */}
          {!isEditing && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-[var(--kt-text-dark)] mb-2">Palabras detectadas:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[var(--kt-text-muted)]">Idioma:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysisData.keyIndicators.languageKeywords.slice(0, 3).map((word, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {word}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--kt-text-muted)]">Tipo:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysisData.keyIndicators.documentTypeKeywords.slice(0, 3).map((word, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {word}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[var(--kt-text-muted)]">Dirección:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {analysisData.keyIndicators.directionKeywords.slice(0, 3).map((word, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {word}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Extracted Data */}
          {analysisData.extractedData && Object.keys(analysisData.extractedData).length > 0 && !isEditing && (
            <div>
              <p className="font-medium text-[var(--kt-text-dark)] mb-2">Datos extraídos:</p>
              <div className="bg-[var(--kt-gray-50)] p-4 rounded-lg">
                {Object.entries(analysisData.extractedData)
                .filter(([key]) => key !== 'detectedAt' && key !== 'tipoDocumento' && key !== 'idioma' && key !== 'direccion')
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1">
                    <span className="text-[var(--kt-text-muted)]">{key}:</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEditing && (
            <div className="space-y-4 rounded-lg border p-4">
              <p className="font-medium text-[var(--kt-text-dark)]">Corrección de datos detectados</p>

              {analysisData.tipoDocumento === "guia_valija" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-[var(--kt-text-muted)]">Número de Guía</label>
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      value={overrides.extractedData.numeroGuia || ""}
                      onChange={(e) => setExtractedField("numeroGuia", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-[var(--kt-text-muted)]">Tipo de Valija</label>
                    <select
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      value={overrides.valijaClassification.tipoValija}
                      onChange={(e) =>
                        setOverrides((prev) => ({
                          ...prev,
                          valijaClassification: {
                            ...prev.valijaClassification,
                            tipoValija: e.target.value === "SALIDA" ? "SALIDA" : "ENTRADA",
                          },
                        }))
                      }
                    >
                      <option value="ENTRADA">ENTRADA</option>
                      <option value="SALIDA">SALIDA</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={overrides.valijaClassification.isExtraordinaria}
                      onChange={(e) =>
                        setOverrides((prev) => ({
                          ...prev,
                          valijaClassification: {
                            ...prev.valijaClassification,
                            isExtraordinaria: e.target.checked,
                          },
                        }))
                      }
                    />
                    Marcar como extraordinaria
                  </label>
                </div>
              )}

              {analysisData.tipoDocumento === "hoja_remision" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: "numero", label: "Número" },
                    { key: "numeroCompleto", label: "Número Completo" },
                    { key: "siglaUnidad", label: "Sigla Unidad" },
                    { key: "para", label: "Para" },
                    { key: "remitente", label: "Remitente" },
                    { key: "asunto", label: "Asunto" },
                    { key: "destino", label: "Destino" },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="text-sm text-[var(--kt-text-muted)]">{field.label}</label>
                      <input
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={overrides.extractedData[field.key] || ""}
                        onChange={(e) => setExtractedField(field.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {analysisData.tipoDocumento === "oficio" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: "asunto", label: "Asunto" },
                    { key: "entidadEmisora", label: "Entidad Emisora" },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="text-sm text-[var(--kt-text-muted)]">{field.label}</label>
                      <input
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={overrides.extractedData[field.key] || ""}
                        onChange={(e) => setExtractedField(field.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendation */}
      <Alert className="mb-8">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Recomendación:</strong> {recommendation.description}
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
          <CardDescription>
            Elige qué hacer con los datos analizados
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Button
            onClick={handleConfirm}
            className="flex-1 min-w-[200px]"
            disabled={isSubmitting}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar y Continuar
          </Button>

          <Button
            variant="outline"
            onClick={isEditing ? handleCancelEdit : handleEdit}
            disabled={isSubmitting}
            className="flex-1 min-w-[200px]"
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? "Cancelar Corrección" : "Corregir Datos"}
          </Button>

          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={loading || isSubmitting}
            className="flex-1 min-w-[200px]"
          >
            <FileText className="h-4 w-4 mr-2" />
            Reanalizar
          </Button>

          <Button
            variant="destructive"
            onClick={() => setIsRejectDialogOpen(true)}
            disabled={isSubmitting}
            className="flex-1 min-w-[200px]"
          >
            Rechazar Análisis
          </Button>

          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex-1 min-w-[200px]"
          >
            Cancelar
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isRejectDialogOpen} onOpenChange={(open) => !open && closeRejectDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Análisis</DialogTitle>
            <DialogDescription>
              Indica el motivo para registrar la revisión manual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="reject-reason" className="text-sm font-medium">
              Motivo
            </label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Describe por qué se rechaza el análisis"
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeRejectDialog}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}>
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function VerifyDocumentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--kt-text-muted)]">Cargando...</p>
        </div>
      </div>
    }>
      <VerifyDocumentContent />
    </Suspense>
  )
}
