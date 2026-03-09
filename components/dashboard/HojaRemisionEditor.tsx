"use client"

import { useMemo, useRef, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { ErrorState } from "@/components/ui/ErrorState"
import { toast } from "sonner"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import HojaRemisionForm, { type HojaRemisionFormData } from "@/components/dashboard/HojaRemisionForm"
import type { ParsedHojaRemisionData } from "@/lib/hojas-remision-parser"

const PDFViewer = dynamic(() => import("@/components/dashboard/PDFViewer"), {
  loading: () => <LoadingSpinner message="Cargando visor PDF..." />,
})
const HojaRemisionConfirmacion = dynamic(
  () => import("@/components/dashboard/HojaRemisionConfirmacion").then((mod) => mod.HojaRemisionConfirmacion),
  {
    loading: () => <LoadingSpinner message="Cargando confirmación..." />,
  }
)

type UploadState = "idle" | "uploading" | "analyzing" | "ready" | "saving" | "error"
type WizardStep = "form" | "confirmation" | "edit"

interface HojaRemisionEditorProps {
  mode: "create" | "edit"
  initialFormData?: Partial<HojaRemisionFormData>
  documentId?: string
  documentNumber?: string
  onSave: (
    data: HojaRemisionFormData,
    file?: File | null
  ) => Promise<{ success: boolean; error?: string }>
}

function formatFileSize(fileSize: number) {
  return `${(fileSize / 1024).toFixed(1)} KB`
}

export default function HojaRemisionEditor({
  mode,
  initialFormData,
  documentId,
  documentNumber,
  onSave,
}: HojaRemisionEditorProps) {
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

  const existingPdfSrc = !file && documentId ? `/api/hojas-remision/file/${documentId}` : null
  const hasPreview = Boolean(file || existingPdfSrc)
  const showPdfPanel = hasPreview && (wizardStep === "form" || wizardStep === "edit")

  const title = useMemo(() => {
    if (wizardStep === "confirmation") return "Confirmar Datos Extraidos"
    if (wizardStep === "edit" && file) return "Editar Datos Extraidos"
    return mode === "edit" ? "Editar Hoja de Remision" : "Nueva Hoja de Remision"
  }, [mode, wizardStep, file])

  const subtitle = useMemo(() => {
    if (wizardStep === "confirmation") return "Revisa la extraccion automatica antes de aplicarla al formulario."
    if (wizardStep === "edit" && file) return "Ajusta los datos extraidos y guarda una version confiable del documento."
    if (mode === "edit") {
      return documentNumber
        ? `${documentNumber} · puedes reemplazar el PDF o editar los datos manualmente.`
        : "Puedes reemplazar el PDF o editar los datos manualmente."
    }
    return "Carga un PDF o completa el formulario manualmente desde esta mesa de trabajo."
  }, [documentNumber, file, mode, wizardStep])

  const stepIndex = wizardStep === "confirmation" ? 2 : wizardStep === "edit" && file ? 3 : 1

  const stepItems = [
    { number: 1, label: "Documento", active: stepIndex >= 1 },
    { number: 2, label: "Revision", active: stepIndex >= 2 && Boolean(file) },
    { number: 3, label: "Guardado", active: stepIndex >= 3 && Boolean(file) },
  ]

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Solo se permiten archivos PDF.")
      return
    }
    if (selectedFile.size === 0) {
      toast.error("El archivo PDF esta vacio.")
      return
    }

    setFile(selectedFile)
    void analyzeDocument(selectedFile)
  }

  const analyzeDocument = async (fileToAnalyze: File) => {
    setUploadState("uploading")
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", fileToAnalyze)

      setUploadState("analyzing")

      const response = await fetch("/api/analyze/hoja-remision", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("No se pudo analizar el PDF.")
      }

      const result = await response.json()
      setAzureResult(result.azureResult)
      setExtractedData(result.extractedData)
      setUploadState("ready")
      setWizardStep("confirmation")
      toast.success("PDF analizado correctamente.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al analizar el documento."
      setError(message)
      setUploadState("error")
      toast.error(message)
    }
  }

  const handleSave = async (formData: HojaRemisionFormData) => {
    try {
      setUploadState("saving")
      const result = await onSave(formData, file)

      if (!result.success) {
        throw new Error(result.error || "No se pudo guardar la hoja de remision.")
      }

      toast.success(mode === "edit" ? "Hoja de remision actualizada." : "Hoja de remision creada.")
      router.push("/dashboard/hojas-remision")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar."
      toast.error(message)
      setUploadState(file ? "ready" : "idle")
    }
  }

  const resetUploadState = () => {
    setError(null)
    setUploadState("idle")
    setFile(null)
    setExtractedData(null)
    setAzureResult(null)
    setWizardStep("form")
    setShowPDF(true)
    setShowAzureJson(false)
    setShowKeyValuePairs(false)
  }

  const handleConfirmData = () => {
    if (!extractedData?.numeroCompleto || !extractedData.fecha || !extractedData.remitente) {
      toast.error("Faltan campos requeridos. Corrige la extraccion o edita manualmente.")
      return
    }

    setWizardStep("edit")
    toast.success("Extraccion confirmada. Revisa y guarda.")
  }

  const handleRejectData = () => {
    resetUploadState()
    toast.info("Extraccion descartada. Puedes subir otro PDF o seguir manualmente.")
  }

  const handleRetryUpload = () => {
    resetUploadState()
    fileInputRef.current?.click()
  }

  const panelFormData = wizardStep === "edit" && extractedData ? extractedData : initialFormData
  const fileLabel = file?.name || (documentNumber ? `PDF asociado a ${documentNumber}` : "PDF asociado")
  const fileMeta = file ? formatFileSize(file.size) : existingPdfSrc ? "Archivo actual" : null

  return (
    <div className="space-y-6">
      <div className="sticky top-3 z-20 rounded-2xl border border-[var(--kt-gray-200)] bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              {documentNumber && (
                <Badge variant="outline" className="border-[var(--kt-primary)]/30 bg-[var(--kt-primary-light)] text-[var(--kt-primary)]">
                  {documentNumber}
                </Badge>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-semibold text-[var(--kt-text-dark)]">{title}</h1>
              <p className="max-w-3xl text-sm text-[var(--kt-text-muted)]">{subtitle}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {stepItems.map((step) => (
                <div
                  key={step.number}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                    step.active
                      ? "border-[var(--kt-primary)] bg-[var(--kt-primary-light)] text-[var(--kt-primary)]"
                      : "border-[var(--kt-gray-300)] bg-white text-[var(--kt-text-muted)]"
                  }`}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[11px]">
                    {step.number}
                  </span>
                  {step.label}
                </div>
              ))}
            </div>
          </div>

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
              <Upload className="mr-2 h-4 w-4" />
              {mode === "edit" ? "Reemplazar PDF" : "Subir PDF"}
            </Button>
          </div>
        </div>
      </div>

      {uploadState === "error" && error && <ErrorState error={error} onRetry={resetUploadState} />}

      {wizardStep !== "confirmation" && (
        <div className={showPdfPanel ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(560px,1fr)_minmax(640px,1.02fr)]" : "space-y-6"}>
          {showPdfPanel && (
            <aside className="xl:sticky xl:top-28">
              <Card className="overflow-hidden border-[var(--kt-gray-200)] bg-white shadow-lg">
                <button
                  onClick={() => setShowPDF((prev) => !prev)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--kt-gray-50)]"
                >
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5" />
                      Vista previa PDF
                    </CardTitle>
                    <CardDescription>
                      {fileLabel}
                      {fileMeta ? ` · ${fileMeta}` : ""}
                    </CardDescription>
                  </div>
                  {showPDF ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>

                {showPDF && (
                  <CardContent className="border-t border-[var(--kt-gray-200)]">
                    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Fuente</p>
                        <p className="mt-2 text-sm font-medium text-[var(--kt-text-dark)]">
                          {file ? "PDF cargado en esta sesion" : "PDF ya registrado en el sistema"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Modo</p>
                        <p className="mt-2 text-sm font-medium text-[var(--kt-text-dark)]">
                          {file ? "Analisis y captura asistida" : "Edicion manual con soporte documental"}
                        </p>
                      </div>
                    </div>
                    <div className="h-[72vh] min-h-[480px]">
                      <PDFViewer file={file} src={existingPdfSrc} />
                    </div>
                  </CardContent>
                )}
              </Card>
            </aside>
          )}

          <div className="space-y-6">
            {(uploadState === "uploading" || uploadState === "analyzing" || uploadState === "saving") && (
              <Card>
                <CardContent className="py-8">
                  <LoadingSpinner
                    message={
                      uploadState === "uploading"
                        ? "Subiendo archivo..."
                        : uploadState === "analyzing"
                        ? "Analizando documento con Azure AI..."
                        : "Guardando en base de datos..."
                    }
                  />
                </CardContent>
              </Card>
            )}

            {hasPreview && (
              <Card className={`border-l-4 ${file ? "border-l-[var(--kt-primary)]" : "border-l-[var(--kt-info)]"}`}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className={`h-4 w-4 ${file ? "text-[var(--kt-primary)]" : "text-[var(--kt-info)]"}`} />
                      <div>
                        <p className="text-sm font-medium text-[var(--kt-text-dark)]">{fileLabel}</p>
                        <p className="text-xs text-[var(--kt-text-muted)]">
                          {file
                            ? "Este PDF puede reemplazar los datos actuales despues de la revision."
                            : "Estas editando con el PDF actual como referencia visual."}
                        </p>
                      </div>
                    </div>
                    {file && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetUploadState}
                        className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden">
              <CardHeader className="border-b border-[var(--kt-gray-200)] bg-[linear-gradient(180deg,var(--kt-gray-50),white)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{file && extractedData ? "Formulario enriquecido" : "Formulario maestro"}</CardTitle>
                    <CardDescription>
                      {file && extractedData
                        ? "La extraccion ya esta disponible. Puedes aplicarla o seguir corrigiendo manualmente."
                        : "Completa la hoja de remision desde una sola superficie de trabajo."}
                    </CardDescription>
                  </div>
                  {file && extractedData && (
                    <Badge className="bg-[var(--kt-primary-light)] text-[var(--kt-primary)]">
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      Extraccion lista
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <HojaRemisionForm
                  initialData={panelFormData}
                  onSave={handleSave}
                  onCancel={() => router.push("/dashboard/hojas-remision")}
                  submitLabel={mode === "edit" ? "Actualizar Hoja de Remision" : "Guardar Hoja de Remision"}
                />
              </CardContent>
            </Card>

            {uploadState === "ready" && extractedData && (
              <Card className="border-[var(--kt-primary)]/20 bg-[linear-gradient(180deg,white,var(--kt-primary-light))]">
                <CardHeader>
                  <CardTitle>Extraccion disponible</CardTitle>
                  <CardDescription>
                    El PDF fue analizado. Revisa primero la confirmacion o continua con el formulario si prefieres capturar manualmente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={() => setWizardStep("confirmation")}>
                    Revisar extraccion
                  </Button>
                  <Button variant="outline" onClick={handleRetryUpload}>
                    Subir otro PDF
                  </Button>
                </CardContent>
              </Card>
            )}

            {uploadState === "ready" && azureResult && (
              <div className="space-y-4">
                <Card>
                  <button
                    onClick={() => setShowKeyValuePairs((prev) => !prev)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--kt-gray-50)]"
                  >
                    <div>
                      <CardTitle className="text-lg">Campos detectados</CardTitle>
                      <CardDescription>
                        Azure encontro {azureResult.keyValuePairs?.length || 0} pares clave-valor.
                      </CardDescription>
                    </div>
                    {showKeyValuePairs ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>

                  {showKeyValuePairs && azureResult?.keyValuePairs && (
                    <CardContent className="border-t border-[var(--kt-gray-200)]">
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {azureResult.keyValuePairs.map((pair: any, index: number) => (
                          <div key={index} className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs font-semibold uppercase text-[var(--kt-text-muted)]">Key</span>
                                <p className="text-sm font-medium text-[var(--kt-text-dark)]">{pair.key?.content || "(vacio)"}</p>
                              </div>
                              <div>
                                <span className="text-xs font-semibold uppercase text-[var(--kt-text-muted)]">Value</span>
                                <p className="text-sm text-[var(--kt-text-dark)]">{pair.value?.content || "(vacio)"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Card>
                  <button
                    onClick={() => {
                      const next = !showAzureJson
                      setShowAzureJson(next)
                      if (next) setShowKeyValuePairs(false)
                    }}
                    className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--kt-gray-50)]"
                  >
                    <div>
                      <CardTitle className="text-lg">Respuesta tecnica</CardTitle>
                      <CardDescription>Salida completa del analizador para depuracion y QA.</CardDescription>
                    </div>
                    {showAzureJson && !showKeyValuePairs ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>

                  {showAzureJson && !showKeyValuePairs && (
                    <CardContent className="border-t border-[var(--kt-gray-200)]">
                      <pre className="max-h-96 overflow-auto rounded-lg bg-[var(--kt-gray-900)] p-4 text-xs text-[var(--kt-gray-100)]">
                        {JSON.stringify(azureResult, null, 2)}
                      </pre>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {wizardStep === "confirmation" && extractedData && file && (
        <Suspense fallback={<LoadingSpinner message="Cargando confirmación..." />}>
          <HojaRemisionConfirmacion
            extractedData={extractedData}
            azureResult={azureResult}
            fileName={file.name}
            fileSize={file.size}
            file={file}
            onConfirm={handleConfirmData}
            onReject={handleRejectData}
            onRetry={handleRetryUpload}
            onDataChanged={setExtractedData}
          />
        </Suspense>
      )}
    </div>
  )
}
