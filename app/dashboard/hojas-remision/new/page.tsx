"use client"

import { useState, useRef, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Upload, ChevronDown, ChevronRight, FileText, X } from "lucide-react"
import { toast } from "sonner"
import HojaRemisionForm, {
  type HojaRemisionFormData,
} from "@/components/dashboard/HojaRemisionForm"
import { createHojaRemision } from "@/app/dashboard/hojas-remision/actions"
import type { ParsedHojaRemisionData } from "@/lib/hojas-remision-parser"

// Lazy load heavy components
const PDFViewer = lazy(() => import("@/components/dashboard/PDFViewer"))
const HojaRemisionConfirmacion = lazy(() => import("@/components/dashboard/HojaRemisionConfirmacion"))

type UploadState = "idle" | "uploading" | "analyzing" | "ready" | "saving" | "error"
type WizardStep = "form" | "confirmation" | "edit"

export default function NewHojaRemisionPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [extractedData, setExtractedData] = useState<ParsedHojaRemisionData | null>(null)
  const [azureResult, setAzureResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [wizardStep, setWizardStep] = useState<WizardStep>("form")
  const [showPDF, setShowPDF] = useState(true)
  const [showAzureJson, setShowAzureJson] = useState(false)
  const [showKeyValuePairs, setShowKeyValuePairs] = useState(false)
  const formRef = useRef<{ submit: () => void } | null>(null)

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf") {
      toast.error("Por favor sube un archivo PDF")
      return
    }
    setFile(selectedFile)
    analyzeDocument(selectedFile)
  }

  const analyzeDocument = async (fileToAnalyze: File) => {
    setUploadState("uploading")
    setError(null)

    try {
      // Preparar FormData
      const formData = new FormData()
      formData.append("file", fileToAnalyze)

      setUploadState("analyzing")

      // Enviar a endpoint de análisis
      const response = await fetch("/api/analyze/hoja-remision", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error al analizar el documento")
      }

      const result = await response.json()
      const { azureResult: azure, extractedData: data } = result

      setAzureResult(azure)
      setExtractedData(data)
      setUploadState("ready")
      setWizardStep("confirmation")
      toast.success("Documento analizado correctamente")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al analizar el documento"
      setError(errorMessage)
      setUploadState("error")
      toast.error(errorMessage)
    }
  }

  const handleSave = async (formData: HojaRemisionFormData) => {
    try {
      setUploadState("saving")

      const result = await createHojaRemision(formData, file)

      if (!result.success) {
        throw new Error(result.error || "Error al guardar")
      }

      toast.success("Hoja de Remisión creada exitosamente")
      router.push("/dashboard/hojas-remision")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al guardar"
      toast.error(errorMessage)
      setUploadState("ready")
    }
  }

  const handleRetry = () => {
    setError(null)
    setUploadState("idle")
    setFile(null)
    setExtractedData(null)
    setAzureResult(null)
  }

  const handleClearFile = () => {
    setFile(null)
    setExtractedData(null)
    setAzureResult(null)
    setUploadState("idle")
    setShowPDF(true)
    setShowAzureJson(false)
    setShowKeyValuePairs(false)
  }

  const handleConfirmData = () => {
    // Validar campos requeridos
    if (!extractedData?.numeroCompleto || !extractedData.fecha || !extractedData.remitente) {
      toast.error("Faltan campos requeridos. Edita manualmente o reintenta.")
      return
    }

    // Poblar formulario con datos extraídos
    setWizardStep("edit")
    toast.success("Datos confirmados. Puedes editar antes de guardar.")
  }

  const handleRejectData = () => {
    // Mantener datos existentes (en este caso volver a formulario vacío)
    setWizardStep("form")
    setExtractedData(null)
    setFile(null)
    toast.info("Datos rechazados. Puedes editar manualmente.")
  }

  const handleRetryUpload = () => {
    // Permitir subir otro PDF
    setWizardStep("form")
    setFile(null)
    setExtractedData(null)
    setAzureResult(null)
    setUploadState("idle")
    fileInputRef.current?.click()
  }

  const handleDataChanged = (newData: ParsedHojaRemisionData) => {
    setExtractedData(newData)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">
              {wizardStep === "confirmation"
                ? "Confirmar Datos Extraídos"
                : wizardStep === "edit"
                ? "Editar Datos Extraídos"
                : "Nueva Hoja de Remisión"}
            </h1>
            <p className="text-[var(--kt-text-muted)]">
              {wizardStep === "confirmation"
                ? "Verifica los datos extraídos del PDF antes de continuar"
                : wizardStep === "edit"
                ? "Edita los datos extraídos antes de guardar"
                : "Crea manualmente o sube un PDF para extraer datos automáticamente"}
            </p>
          </div>
        </div>
        {wizardStep === "form" && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0]
                if (selectedFile) handleFileSelect(selectedFile)
              }}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState === "uploading" || uploadState === "analyzing" || uploadState === "saving"}
            >
              <Upload className="h-4 w-4 mr-2" />
              Subir PDF
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {(uploadState === "uploading" || uploadState === "analyzing" || uploadState === "saving") && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-[var(--kt-text-muted)]">
                  {uploadState === "uploading" && "Subiendo archivo..."}
                  {uploadState === "analyzing" && "Analizando documento con Azure AI..."}
                  {uploadState === "saving" && "Guardando en base de datos..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {uploadState === "error" && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-4xl mb-4">❌</div>
              <p className="text-[var(--kt-danger)] font-medium mb-4">{error}</p>
              <Button onClick={handleRetry} size="sm">Intentar de nuevo</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 1: Formulario inicial (sin PDF subido o después de rechazar) */}
      {wizardStep === "form" && (
        <>
          {/* File Info Bar */}
          {file && uploadState === "ready" && (
            <Card className="border-l-4 border-l-[var(--kt-primary)]">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[var(--kt-primary)]" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-[var(--kt-text-muted)]">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFile}
                    className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Grid: PDF (collapsible) + Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: PDF Viewer (Collapsible) */}
            {file && uploadState === "ready" && (
              <Card>
                <button
                  onClick={() => setShowPDF(!showPDF)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[var(--kt-gray-50)] transition-colors"
                >
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      PDF Original
                    </CardTitle>
                    <CardDescription>
                      {file.name}
                    </CardDescription>
                  </div>
                  {showPDF ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>

                {showPDF && (
                  <CardContent className="border-t border-[var(--kt-gray-200)]">
                    <div className="h-[500px]">
                      <Suspense fallback={<div className="h-full flex items-center justify-center text-[var(--kt-text-muted)]">Cargando visor PDF...</div>}>
                        <PDFViewer file={file} />
                      </Suspense>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Right: Form (Always Visible) */}
            <Card className={file && uploadState === "ready" ? "" : "lg:col-span-2"}>
              <CardHeader>
                <CardTitle>
                  {uploadState === "ready" && extractedData ? "Datos Extraídos" : "Ingresar Datos"}
                </CardTitle>
                <CardDescription>
                  {uploadState === "ready" && extractedData
                    ? "Verifica y corrige los datos extraídos antes de guardar"
                    : "Completa el formulario manualmente o sube un PDF para extraer datos automáticamente"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HojaRemisionForm
                  initialData={extractedData || undefined}
                  onSave={handleSave}
                  onCancel={() => router.push("/dashboard/hojas-remision")}
                />
              </CardContent>
            </Card>
          </div>

          {/* Azure JSON & KeyValuePairs Section (Only when ready) */}
          {uploadState === "ready" && azureResult && (
            <div className="space-y-4">
              {/* KeyValuePairs Toggle */}
              <Card>
                <button
                  onClick={() => setShowKeyValuePairs(!showKeyValuePairs)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[var(--kt-gray-50)] transition-colors"
                >
                  <div>
                    <CardTitle className="text-lg">KeyValuePairs Extraídos</CardTitle>
                    <CardDescription>
                      Pares clave-valor detectados por Azure AI ({azureResult.keyValuePairs?.length || 0} campos)
                    </CardDescription>
                  </div>
                  {showKeyValuePairs ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>

                {showKeyValuePairs && azureResult?.keyValuePairs && (
                  <CardContent className="border-t border-[var(--kt-gray-200)]">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {azureResult.keyValuePairs.map((pair: any, index: number) => (
                        <div key={index} className="p-3 bg-[var(--kt-gray-50)] rounded-lg border border-[var(--kt-gray-200)]">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-semibold text-[var(--kt-text-muted)] uppercase">Key</span>
                              <p className="text-sm font-medium text-[var(--kt-text-dark)]">{pair.key?.content || '(vacío)'}</p>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-[var(--kt-text-muted)] uppercase">Value</span>
                              <p className="text-sm text-[var(--kt-text-dark)]">{pair.value?.content || '(vacío)'}</p>
                            </div>
                          </div>
                          {pair.confidence && (
                            <div className="mt-2">
                              <span className="text-xs text-[var(--kt-text-muted)]">
                                Confianza: {(pair.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Azure JSON Toggle */}
              <Card>
                <button
                  onClick={() => {
                    // Toggle between showing JSON and key-value pairs
                    const newShowAzureJson = !showAzureJson
                    setShowAzureJson(newShowAzureJson)
                    if (newShowAzureJson) setShowKeyValuePairs(false)
                  }}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[var(--kt-gray-50)] transition-colors"
                >
                  <div>
                    <CardTitle className="text-lg">JSON Completo de Azure AI</CardTitle>
                    <CardDescription>
                      Respuesta cruda del servicio Azure Document Intelligence
                    </CardDescription>
                  </div>
                  {showAzureJson && !showKeyValuePairs ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>

                {showAzureJson && !showKeyValuePairs && (
                  <CardContent className="border-t border-[var(--kt-gray-200)]">
                    <pre className="bg-[var(--kt-gray-900)] text-[var(--kt-gray-100)] p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                      {JSON.stringify(azureResult, null, 2)}
                    </pre>
                  </CardContent>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {/* PASO 2: Confirmación de datos extraídos */}
      {wizardStep === "confirmation" && extractedData && file && (
        <Suspense fallback={<Card><CardContent className="py-8 text-center">Cargando confirmación...</CardContent></Card>}>
          <HojaRemisionConfirmacion
            extractedData={extractedData}
            azureResult={azureResult}
            fileName={file.name}
            fileSize={file.size}
            file={file}
            onConfirm={handleConfirmData}
            onReject={handleRejectData}
            onRetry={handleRetryUpload}
            onDataChanged={handleDataChanged}
          />
        </Suspense>
      )}

      {/* PASO 3: Edición final con datos extraídos confirmados */}
      {wizardStep === "edit" && extractedData && file && (
        <>
          {/* File Info Bar - Confirmed */}
          <Card className="border-l-4 border-l-[var(--kt-success)]">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[var(--kt-success)]" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-[var(--kt-success)]">
                    ✓ Datos confirmados
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWizardStep("confirmation")}
                >
                  Volver a confirmación
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PDF Viewer + Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="h-[500px]">
                  <Suspense fallback={<div className="h-full flex items-center justify-center text-[var(--kt-text-muted)]">Cargando visor PDF...</div>}>
                    <PDFViewer file={file} />
                  </Suspense>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Editar Datos Extraídos</CardTitle>
                <CardDescription>
                  Verifica y edita los datos extraídos antes de guardar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HojaRemisionForm
                  initialData={extractedData}
                  onSave={handleSave}
                  onCancel={() => router.push("/dashboard/hojas-remision")}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
