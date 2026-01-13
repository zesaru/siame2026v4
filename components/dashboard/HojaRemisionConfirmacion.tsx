import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, ChevronDown, ChevronRight, Check, X, RefreshCw } from "lucide-react"
import PDFViewer from "./PDFViewer"
import type { ParsedHojaRemisionData } from "@/lib/hojas-remision-parser"

interface HojaRemisionConfirmacionProps {
  extractedData: ParsedHojaRemisionData
  azureResult: any
  fileName: string
  fileSize: number
  file?: File
  onConfirm: () => void
  onReject: () => void
  onRetry: () => void
  onDataChanged?: (data: ParsedHojaRemisionData) => void
}

export function HojaRemisionConfirmacion({
  extractedData,
  azureResult,
  fileName,
  fileSize,
  file,
  onConfirm,
  onReject,
  onRetry,
  onDataChanged,
}: HojaRemisionConfirmacionProps) {

  // Estado para JSON panel
  const [showAzureJson, setShowAzureJson] = useState(false)

  // Estado local para campos editables (copia de extractedData)
  const [editableData, setEditableData] = useState<ParsedHojaRemisionData>(extractedData)

  // Sincronizar cuando cambia extractedData externamente
  useEffect(() => {
    setEditableData(extractedData)
  }, [extractedData])

  // Handler para actualizar un campo específico
  const handleFieldChange = (field: keyof ParsedHojaRemisionData, value: any) => {
    const newData = {
      ...editableData,
      [field]: value,
    }
    setEditableData(newData)
    // Notificar al padre si hay callback
    onDataChanged?.(newData)
  }

  // Validar campos requeridos
  const hasRequiredFields = Boolean(
    extractedData.numeroCompleto && extractedData.fecha && extractedData.remitente
  )

  // Función para obtener color de badge de confianza
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-100 text-green-800"
    if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800"
    if (confidence > 0) return "bg-orange-100 text-orange-800"
    return "bg-red-100 text-red-800"
  }

  // Función para obtener barra de progreso de confianza
  const getConfidenceBar = (confidence: number) => {
    const percentage = Math.round(confidence * 100)
    const filledWidth = Math.round(confidence * 40) // 40 caracteres width

    return (
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${
              confidence >= 0.9
                ? "bg-green-500"
                : confidence >= 0.7
                ? "bg-yellow-500"
                : confidence > 0
                ? "bg-orange-500"
                : "bg-red-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-600">{percentage}%</span>
      </div>
    )
  }

  // Función para formatear fecha
  const formatFecha = (fecha: Date | null) => {
    if (!fecha) return "No detectada"
    return new Date(fecha).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">
            Confirmar Datos Extraídos
          </h1>
          <p className="text-[var(--kt-text-muted)] mt-1">
            Verifica que los datos extraídos del PDF sean correctos antes de continuar
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800">
          PDF analizado con Azure AI
        </Badge>
      </div>

      {/* Validation Warning */}
      {!hasRequiredFields && (
        <Card className="border-l-4 border-l-[var(--kt-warning)]">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-[var(--kt-warning)]">
                  Algunos campos requeridos no se detectaron correctamente
                </p>
                <p className="text-sm text-[var(--kt-text-muted)] mt-1">
                  Puedes confirmar de todas formas y editar manualmente, o rechazar estos datos y subir otro PDF.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid Layout: PDF (40%) + Campos (60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Izquierda: PDF Viewer (40% = 2/5 columnas) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">PDF Original</CardTitle>
            <CardDescription>{fileName}</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[calc(100vh-400px)] min-h-[500px]">
              {file ? <PDFViewer file={file} /> : <p className="text-center text-[var(--kt-text-muted)]">No hay archivo PDF</p>}
            </div>
          </CardContent>
        </Card>

        {/* Derecha: Campos Extraídos (60% = 3/5 columnas) */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Campos Extraídos</CardTitle>
            <CardDescription>
              Datos detectados por Azure AI con su nivel de confianza
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
              {/* Número Completo */}
              <div className="p-4 bg-[var(--kt-gray-50)] rounded-lg border border-[var(--kt-gray-200)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--kt-text-muted)] uppercase">
                    Número Completo
                  </span>
                  <Badge variant="destructive" className="text-xs">Requerido</Badge>
                </div>
                <input
                  type="text"
                  value={editableData.numeroCompleto || ""}
                  onChange={(e) => handleFieldChange("numeroCompleto", e.target.value)}
                  className="w-full px-3 py-2 text-lg font-medium border border-[var(--kt-gray-300)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)] focus:border-transparent bg-white"
                  placeholder="No detectado"
                />
                {getConfidenceBar(extractedData.confidence.numeroCompleto)}
              </div>

              {/* Unidad */}
              <div className="p-4 bg-[var(--kt-gray-50)] rounded-lg border border-[var(--kt-gray-200)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--kt-text-muted)] uppercase">
                    Unidad
                  </span>
                  <Badge variant="outline" className="text-xs">Opcional</Badge>
                </div>
                <input
                  type="text"
                  value={editableData.siglaUnidad || ""}
                  onChange={(e) => handleFieldChange("siglaUnidad", e.target.value)}
                  className="w-full px-3 py-2 text-lg font-medium border border-[var(--kt-gray-300)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)] focus:border-transparent bg-white"
                  placeholder="No detectada"
                />
                {getConfidenceBar(extractedData.confidence.siglaUnidad)}
              </div>

              {/* Fecha */}
              <div className="p-4 bg-[var(--kt-gray-50)] rounded-lg border border-[var(--kt-gray-200)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--kt-text-muted)] uppercase">
                    Fecha
                  </span>
                  <Badge variant="destructive" className="text-xs">Requerido</Badge>
                </div>
                <input
                  type="date"
                  value={editableData.fecha ? new Date(editableData.fecha).toISOString().split('T')[0] : ""}
                  onChange={(e) => handleFieldChange("fecha", e.target.value ? new Date(e.target.value) : null)}
                  className="w-full px-3 py-2 text-lg font-medium border border-[var(--kt-gray-300)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)] focus:border-transparent bg-white"
                />
                {getConfidenceBar(extractedData.confidence.fecha)}
              </div>

              {/* Remitente */}
              <div className="p-4 bg-[var(--kt-gray-50)] rounded-lg border border-[var(--kt-gray-200)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--kt-text-muted)] uppercase">
                    Remitente
                  </span>
                  <Badge variant="destructive" className="text-xs">Requerido</Badge>
                </div>
                <textarea
                  value={editableData.remitente || ""}
                  onChange={(e) => handleFieldChange("remitente", e.target.value)}
                  className="w-full px-3 py-2 text-base font-medium border border-[var(--kt-gray-300)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)] focus:border-transparent bg-white min-h-[80px] resize-y"
                  placeholder="No detectado"
                  rows={3}
                />
                {getConfidenceBar(extractedData.confidence.remitente)}
              </div>

              {/* Documento */}
              <div className="p-4 bg-[var(--kt-gray-50)] rounded-lg border border-[var(--kt-gray-200)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--kt-text-muted)] uppercase">
                    Documento
                  </span>
                  <Badge variant="outline" className="text-xs">Opcional</Badge>
                </div>
                <textarea
                  value={editableData.documento || ""}
                  onChange={(e) => handleFieldChange("documento", e.target.value)}
                  className="w-full px-3 py-2 text-base border border-[var(--kt-gray-300)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)] focus:border-transparent bg-white min-h-[80px] resize-y"
                  placeholder="No detectado"
                  rows={3}
                />
                {getConfidenceBar(extractedData.confidence.documento)}
              </div>

              {/* Asunto */}
              <div className="p-4 bg-[var(--kt-gray-50)] rounded-lg border border-[var(--kt-gray-200)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--kt-text-muted)] uppercase">
                    Asunto
                  </span>
                  <Badge variant="outline" className="text-xs">Opcional</Badge>
                </div>
                <textarea
                  value={editableData.asunto || ""}
                  onChange={(e) => handleFieldChange("asunto", e.target.value)}
                  className="w-full px-3 py-2 text-base border border-[var(--kt-gray-300)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)] focus:border-transparent bg-white min-h-[80px] resize-y"
                  placeholder="No detectado"
                  rows={3}
                />
                {getConfidenceBar(extractedData.confidence.asunto)}
              </div>

              {/* Destino */}
              <div className="p-4 bg-[var(--kt-gray-50)] rounded-lg border border-[var(--kt-gray-200)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[var(--kt-text-muted)] uppercase">
                    Destino
                  </span>
                  <Badge variant="outline" className="text-xs">Opcional</Badge>
                </div>
                <input
                  type="text"
                  value={editableData.destino || ""}
                  onChange={(e) => handleFieldChange("destino", e.target.value)}
                  className="w-full px-3 py-2 text-base border border-[var(--kt-gray-300)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)] focus:border-transparent bg-white"
                  placeholder="No detectado"
                />
                {getConfidenceBar(extractedData.confidence.destino)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Azure JSON Panel (collapsible) */}
      <Card>
        <button
          onClick={() => setShowAzureJson(!showAzureJson)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[var(--kt-gray-50)] transition-colors"
        >
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">{`{ }`}</span>
              JSON de Respuesta Azure AI
            </CardTitle>
            <CardDescription>
              Respuesta cruda del servicio Azure Document Intelligence
              {azureResult && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {azureResult.keyValuePairs?.length || 0} keyValuePairs
                </span>
              )}
            </CardDescription>
          </div>
          {showAzureJson ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>

        {showAzureJson && azureResult && (
          <CardContent className="border-t border-[var(--kt-gray-200)]">
            <div className="bg-[var(--kt-gray-900)] rounded-lg overflow-hidden">
              <pre className="p-4 text-xs text-[var(--kt-gray-100)] overflow-x-auto max-h-[500px] overflow-y-auto">
                {JSON.stringify(azureResult, null, 2)}
              </pre>
            </div>

            {/* Stats adicionales */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {azureResult.keyValuePairs && (
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  keyValuePairs: {azureResult.keyValuePairs.length} campos
                </span>
              )}
              {azureResult.tables && (
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  tables: {azureResult.tables.length} tablas
                </span>
              )}
              {azureResult.pages && (
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  pages: {azureResult.pages.length} páginas
                </span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={onConfirm}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Check className="h-5 w-5 mr-2" />
              Confirmar y Continuar
            </Button>

            <Button
              onClick={onReject}
              variant="outline"
              className="w-full sm:w-auto"
              size="lg"
            >
              <X className="h-5 w-5 mr-2" />
              Rechazar Datos
            </Button>

            <Button
              onClick={onRetry}
              variant="ghost"
              className="w-full sm:w-auto"
              size="lg"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Subir Otro PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
