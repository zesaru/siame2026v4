"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Edit, FileText, MapPin, Globe } from "lucide-react"
import { toast } from "sonner"

interface AnalysisResult {
  documentId: string
  specificRecordId: string
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
    extractedData: any
    keyIndicators: {
      languageKeywords: string[]
      documentTypeKeywords: string[]
      directionKeywords: string[]
    }
  }
  recommendation: {
    title: string
    description: string
    formPath: string
  }
}

export default function VerifyDocumentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentId = searchParams?.get('documentId')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

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
    } catch (error) {
      toast.error("Error al cargar el análisis del documento")
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!analysis) return

    // Redirigir al formulario correspondiente con los datos pre-cargados
    const { formPath } = analysis.recommendation
    const params = new URLSearchParams({
      preFilled: 'true',
      documentId: analysis.documentId,
      tipoDocumento: analysis.analysis.tipoDocumento,
      direccion: analysis.analysis.direccion,
      idioma: analysis.analysis.idioma
    })

    router.push(`${formPath}?${params.toString()}`)
  }

  const handleEdit = () => {
    setIsEditing(true)
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
          {analysisData.extractedData && Object.keys(analysisData.extractedData).length > 0 && (
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
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar y Continuar
          </Button>

          <Button
            variant="outline"
            onClick={handleEdit}
            disabled={isEditing}
            className="flex-1 min-w-[200px]"
          >
            <Edit className="h-4 w-4 mr-2" />
            Corregir Datos
          </Button>

          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={loading}
            className="flex-1 min-w-[200px]"
          >
            <FileText className="h-4 w-4 mr-2" />
            Reanalizar
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
    </div>
  )
}