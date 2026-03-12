"use client"

import { useEffect, useMemo, useRef, useState, Suspense } from "react"
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
  PencilLine,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import HojaRemisionForm, { type HojaRemisionFormData } from "@/components/dashboard/HojaRemisionForm"
import type { ParsedHojaRemisionData } from "@/lib/hojas-remision-parser"
import { normalizeHojaRemisionEstado } from "@/lib/hoja-remision-status"
import { formatFileSize, validatePdfFile } from "@/lib/pdf-upload"

const PDFViewer = dynamic(() => import("@/components/dashboard/PDFViewer"), {
  loading: () => <LoadingSpinner message="Cargando visor PDF..." />,
})
const HojaRemisionConfirmacion = dynamic(
  () => import("@/components/dashboard/HojaRemisionConfirmacion").then((mod) => mod.HojaRemisionConfirmacion),
  {
    loading: () => <LoadingSpinner message="Cargando confirmacion..." />,
  }
)

type UploadState = "idle" | "uploading" | "analyzing" | "ready" | "saving" | "error"
type WizardStep = "form" | "confirmation" | "edit"

interface HojaRemisionEditorProps {
  mode: "create" | "edit"
  initialFormData?: Partial<HojaRemisionFormData> & { filePath?: string | null }
  documentId?: string
  documentNumber?: string
  initialIntent?: "upload" | "manual"
  onSave: (
    data: HojaRemisionFormData,
    file?: File | null
  ) => Promise<{ success: boolean; error?: string }>
}

export default function HojaRemisionEditor({
  mode,
  initialFormData,
  documentId,
  documentNumber,
  initialIntent = "manual",
  onSave,
}: HojaRemisionEditorProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadIntentHandledRef = useRef(false)

  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [extractedData, setExtractedData] = useState<ParsedHojaRemisionData | null>(null)
  const [azureResult, setAzureResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [wizardStep, setWizardStep] = useState<WizardStep>("form")
  const [showPDF, setShowPDF] = useState(true)
  const [showAzureJson, setShowAzureJson] = useState(false)
  const [showKeyValuePairs, setShowKeyValuePairs] = useState(false)

  const hasStoredPdf = Boolean(initialFormData?.filePath)
  const existingPdfSrc = !file && documentId && hasStoredPdf ? `/api/hojas-remision/file/${documentId}` : null
  const hasPreview = Boolean(file || existingPdfSrc)
  const showPdfPanel = hasPreview && (wizardStep === "form" || wizardStep === "edit")
  const prioritizePdfColumn = Boolean(file)

  const title = useMemo(() => {
    if (wizardStep === "confirmation") return "Confirmar datos extraidos"
    if (wizardStep === "edit" && file) return "Editar datos extraidos"
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
    {
      key: "manual",
      label: "Edicion manual",
      description: "Formulario listo para captura o ajuste.",
      active: stepIndex >= 1,
      icon: PencilLine,
    },
    {
      key: "analysis",
      label: "Extraccion",
      description: file ? "PDF analizado y pendiente de validacion." : "Sin PDF nuevo en revision.",
      active: stepIndex >= 2 && Boolean(file),
      icon: ScanSearch,
    },
    {
      key: "ready",
      label: "Listo para guardar",
      description: file ? "Datos confirmados y listos para persistir." : "Guardado manual disponible.",
      active: stepIndex >= 3 && Boolean(file),
      icon: ShieldCheck,
    },
  ]

  const handleFileSelect = (selectedFile: File) => {
    const validation = validatePdfFile(selectedFile)
    if (!validation.ok) {
      toast.error(validation.error)
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

      toast.success(
        file
          ? "Hoja de remision y PDF guardados correctamente."
          : mode === "edit"
          ? "Hoja de remision actualizada."
          : "Hoja de remision creada."
      )
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

    const formData: HojaRemisionFormData = {
      numero: extractedData.numero || initialFormData?.numero || 0,
      numeroCompleto: extractedData.numeroCompleto || initialFormData?.numeroCompleto || "",
      siglaUnidad: extractedData.siglaUnidad || initialFormData?.siglaUnidad || "",
      fecha: extractedData.fecha || initialFormData?.fecha || new Date(),
      para: extractedData.para || initialFormData?.para || "",
      remitente: extractedData.remitente || initialFormData?.remitente || "",
      referencia: extractedData.referencia || initialFormData?.referencia || "",
      documento: extractedData.documento || initialFormData?.documento || "",
      asunto: extractedData.asunto || initialFormData?.asunto || "",
      destino: extractedData.destino || initialFormData?.destino || extractedData.para || initialFormData?.para || "",
      descripcionEmpaque: extractedData.descripcionEmpaque || initialFormData?.descripcionEmpaque || "",
      peso: extractedData.peso ?? initialFormData?.peso ?? undefined,
      estado: normalizeHojaRemisionEstado(extractedData.estado || initialFormData?.estado),
    }

    if (!formData.para.trim() || !formData.asunto.trim() || !formData.destino.trim()) {
      toast.error("Completa PARA, ASUNTO y DESTINO antes de guardar.")
      return
    }

    void handleSave(formData)
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
  const editorModeLabel = mode === "edit" ? "Actualizacion controlada" : "Registro asistido"
  const extractionLabel =
    uploadState === "ready" && extractedData
      ? "Extraccion disponible"
      : file
      ? "PDF cargado"
      : "Sin extraccion activa"
  const saveLabel =
    uploadState === "saving"
      ? "Guardando cambios"
      : mode === "edit"
      ? "Edicion en curso"
      : "Nuevo registro"
  const shouldShowUploadLauncher = !file && uploadState === "idle"
  const showFocusedUploadFlow =
    initialIntent === "upload" &&
    wizardStep === "form" &&
    (uploadState === "idle" || uploadState === "uploading" || uploadState === "analyzing" || uploadState === "error")

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  useEffect(() => {
    if (initialIntent !== "upload" || uploadIntentHandledRef.current) return
    if (uploadState !== "idle") return

    uploadIntentHandledRef.current = true
    const timer = window.setTimeout(() => {
      openFilePicker()
    }, 150)

    return () => window.clearTimeout(timer)
  }, [initialIntent, uploadState])

  if (showFocusedUploadFlow) {
    const isAnalyzing = uploadState === "uploading" || uploadState === "analyzing"

    return (
      <div className="space-y-6">
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

        <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-sky-200/70 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_35%),linear-gradient(160deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94))] shadow-[0_28px_70px_rgba(14,116,144,0.16)]">
          <div className="border-b border-sky-100/80 px-6 py-5 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100">Carga guiada</Badge>
                  {documentNumber && (
                    <Badge variant="outline" className="border-sky-200 bg-white/80 text-slate-700">
                      {documentNumber}
                    </Badge>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                    {isAnalyzing ? "Analizando hoja de remision" : "Sube el archivo PDF"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {isAnalyzing
                      ? "Mantendremos esta vista hasta terminar el analisis para que no compita con otros paneles ni formularios."
                      : "En este paso solo necesitas cargar el PDF o cancelar. El resto del editor aparece despues del analisis."}
                  </p>
                </div>
              </div>

              <Button variant="ghost" onClick={() => router.back()} className="text-slate-600 hover:text-slate-900">
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="border-b border-sky-100/80 p-6 lg:border-b-0 lg:border-r lg:p-8">
              {isAnalyzing ? (
                <div className="flex min-h-[360px] flex-col justify-between rounded-[28px] border border-sky-200/80 bg-slate-950 px-6 py-6 text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-sky-200/80">
                    <span>Analisis documental</span>
                    <span>{uploadState === "uploading" ? "Subiendo" : "Procesando"}</span>
                  </div>

                  <div className="relative mt-8 overflow-hidden rounded-[24px] border border-sky-400/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.98))] px-6 py-8">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(56,189,248,0.08),transparent)]" />
                    <div className="pointer-events-none absolute inset-x-6 top-0 h-24 animate-pulse rounded-full bg-sky-400/10 blur-3xl" />
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-16 -translate-y-1/2 animate-[pulse_1.8s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgba(56,189,248,0.28),transparent)]" />

                    <div className="relative flex flex-col items-center text-center">
                      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] border border-sky-300/25 bg-sky-400/10">
                        <FileText className="h-10 w-10 text-sky-100" />
                        <span className="absolute -right-2 -top-2 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-sky-300/30 bg-sky-400/20 text-sky-50">
                          <ScanSearch className="h-4 w-4 animate-pulse" />
                        </span>
                      </div>

                      <p className="text-lg font-semibold tracking-[-0.02em] text-white">
                        {uploadState === "uploading" ? "Subiendo PDF al analizador" : "Extrayendo campos y tablas del documento"}
                      </p>
                      <p className="mt-3 max-w-md text-sm leading-6 text-sky-100/80">
                        {file?.name || "El archivo seleccionado"} permanece bloqueado en esta etapa mientras preparamos numero, unidad, fecha y remitente.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="h-2 overflow-hidden rounded-full bg-sky-100/10">
                      <div className="h-full w-2/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-[linear-gradient(90deg,#38bdf8,#bae6fd)]" />
                    </div>
                    <div className="grid gap-3 text-sm text-sky-100/80 sm:grid-cols-3">
                      <div className="rounded-2xl border border-sky-400/15 bg-white/5 px-4 py-3">Validando PDF</div>
                      <div className="rounded-2xl border border-sky-400/15 bg-white/5 px-4 py-3">Leyendo contenido</div>
                      <div className="rounded-2xl border border-sky-400/15 bg-white/5 px-4 py-3">Preparando confirmacion</div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="group flex min-h-[360px] w-full flex-col justify-between rounded-[28px] border border-dashed border-sky-300 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(240,249,255,0.96))] p-6 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition hover:border-sky-400 hover:shadow-[0_20px_40px_rgba(14,116,144,0.12)] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">Paso unico</p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                        Selecciona el PDF de la hoja
                      </h2>
                    </div>
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-sky-200 bg-white text-sky-700 transition group-hover:scale-105 group-hover:border-sky-300">
                      <Upload className="h-6 w-6" />
                    </span>
                  </div>

                  <div className="space-y-4">
                    <p className="max-w-xl text-sm leading-6 text-slate-600">
                      Carga un archivo PDF para reanalizar la hoja de remision. No mostraremos el formulario ni otros bloques hasta completar esta etapa.
                    </p>
                    <div className="inline-flex items-center gap-3 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white">
                      <Upload className="h-4 w-4" />
                      Elegir archivo PDF
                    </div>
                  </div>
                </button>
              )}
            </div>

            <div className="flex flex-col justify-between gap-6 p-6 lg:p-8">
              <div className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Que sigue</p>
                <div className="space-y-3">
                  {[
                    "Subes un solo archivo PDF.",
                    "El sistema analiza contenido, fecha, remitente y estructura.",
                    "Recien despues pasas a la pantalla de confirmacion.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-4">
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800">
                        {item.startsWith("Subes") ? "1" : item.startsWith("El sistema") ? "2" : "3"}
                      </span>
                      <p className="text-sm leading-6 text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.92),rgba(255,255,255,0.96))] p-5">
                <p className="text-sm font-semibold text-slate-900">
                  {isAnalyzing ? "No cierres esta pantalla mientras termina el analisis." : "Si no quieres reemplazar el PDF, cancela y vuelve al editor."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {isAnalyzing
                    ? "Cuando termine, abriremos la confirmacion con los datos detectados."
                    : "Cancelar te devuelve al punto anterior sin tocar la hoja de remision actual."}
                </p>
              </div>

              {uploadState === "error" && error && (
                <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5">
                  <p className="text-sm font-semibold text-rose-800">No se pudo analizar el documento</p>
                  <p className="mt-2 text-sm leading-6 text-rose-700">{error}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button onClick={handleRetryUpload}>
                      <Upload className="mr-2 h-4 w-4" />
                      Intentar otra vez
                    </Button>
                    <Button variant="outline" onClick={() => router.back()}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {!isAnalyzing && uploadState !== "error" && (
                <div className="flex flex-wrap gap-3">
                  <Button onClick={openFilePicker} size="lg" className="bg-sky-600 text-white hover:bg-sky-700">
                    <Upload className="mr-2 h-4 w-4" />
                    Subir archivo PDF
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => router.back()}>
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-3 z-20 overflow-hidden rounded-[28px] border border-[var(--kt-gray-200)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="border-b border-[var(--kt-gray-200)] px-4 py-4 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="ghost" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
                <Badge variant="outline" className="border-[var(--kt-gray-300)] bg-white text-[var(--kt-text-dark)]">
                  {editorModeLabel}
                </Badge>
                {documentNumber && (
                  <Badge variant="outline" className="border-[var(--kt-primary)]/30 bg-[var(--kt-primary-light)] text-[var(--kt-primary)]">
                    {documentNumber}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--kt-text-dark)]">{title}</h1>
                <p className="max-w-3xl text-sm leading-6 text-[var(--kt-text-muted)]">{subtitle}</p>
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
              <Button variant="ghost" onClick={() => router.push("/dashboard/hojas-remision")}>
                Ir al listado
              </Button>
              {!shouldShowUploadLauncher && (
                <Button
                  onClick={openFilePicker}
                  disabled={uploadState === "uploading" || uploadState === "analyzing" || uploadState === "saving"}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {mode === "edit" ? "Reemplazar PDF" : "Subir PDF"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:px-6">
          <div className="rounded-[22px] border border-[var(--kt-gray-200)] bg-white/90 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--kt-text-muted)]">Estado del editor</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {stepItems.map((step) => {
                const StepIcon = step.icon
                return (
                  <div
                    key={step.key}
                    className={`min-w-[180px] flex-1 rounded-2xl border px-4 py-3 ${
                      step.active
                        ? "border-[var(--kt-primary)]/30 bg-[var(--kt-primary-light)]"
                        : "border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
                          step.active
                            ? "bg-white text-[var(--kt-primary)]"
                            : "bg-white text-[var(--kt-text-muted)]"
                        }`}
                      >
                        <StepIcon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-[var(--kt-text-dark)]">{step.label}</p>
                        <p className="text-xs text-[var(--kt-text-muted)]">{step.description}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-[22px] border border-[var(--kt-gray-200)] bg-white/90 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--kt-text-muted)]">Documento fuente</p>
            <p className="mt-3 text-lg font-semibold text-[var(--kt-text-dark)]">{fileLabel}</p>
            <p className="mt-1 text-sm text-[var(--kt-text-muted)]">
              {file ? "Trabajas sobre un PDF recien cargado." : existingPdfSrc ? "Se conserva el PDF registrado." : "Todavia no hay PDF asociado."}
            </p>
            {fileMeta && <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">{fileMeta}</p>}
          </div>

          <div className="rounded-[22px] border border-[var(--kt-gray-200)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,251,0.92))] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--kt-text-muted)]">Operacion</p>
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-sm font-medium text-[var(--kt-text-dark)]">{extractionLabel}</p>
                <p className="text-xs text-[var(--kt-text-muted)]">
                  {file && extractedData ? "Puedes confirmar la extraccion o seguir corrigiendo el formulario." : "El editor sigue operativo incluso sin analisis automatizado."}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--kt-text-dark)]">{saveLabel}</p>
                <p className="text-xs text-[var(--kt-text-muted)]">
                  {mode === "edit" ? "Los cambios actualizan la HR existente y opcionalmente su PDF." : "El registro se crea desde la misma superficie de trabajo."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {uploadState === "error" && error && <ErrorState error={error} onRetry={resetUploadState} />}

      {wizardStep !== "confirmation" && (
        <div className={showPdfPanel ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(420px,0.8fr)_minmax(680px,1.2fr)]" : "space-y-6"}>
          {showPdfPanel && prioritizePdfColumn && (
            <aside className="space-y-4 xl:sticky xl:top-28">
              <Card className="overflow-hidden border-[var(--kt-gray-200)] bg-white shadow-lg">
                <button
                  onClick={() => setShowPDF((prev) => !prev)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--kt-gray-50)]"
                >
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5" />
                      Evidencia PDF
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
                    <div className="mb-4 rounded-xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Referencia visual</p>
                      <p className="mt-2 text-sm font-medium text-[var(--kt-text-dark)]">
                        PDF cargado en esta sesion
                      </p>
                      <p className="mt-1 text-xs text-[var(--kt-text-muted)]">
                        El visor permanece a la izquierda mientras corriges el formulario.
                      </p>
                    </div>
                    <div className="h-[72vh] min-h-[480px]">
                      <PDFViewer file={file} src={existingPdfSrc} />
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card className="overflow-hidden border-[var(--kt-gray-200)]">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-[var(--kt-primary)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--kt-text-dark)]">{fileLabel}</p>
                        <p className="text-xs text-[var(--kt-text-muted)]">
                          Puedes descartar este reemplazo y volver al PDF original.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetUploadState}
                      className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {uploadState === "ready" && azureResult && (
                <Card className="overflow-hidden border-[var(--kt-gray-200)]">
                  <div className="border-b border-[var(--kt-gray-200)] px-6 py-4">
                    <CardTitle className="text-lg">Panel tecnico</CardTitle>
                    <CardDescription>Soporte de QA y validacion, fuera del flujo principal de captura.</CardDescription>
                  </div>
                </Card>
              )}

              {uploadState === "ready" && azureResult && (
                <Card>
                  <button
                    onClick={() => setShowKeyValuePairs((prev) => !prev)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--kt-gray-50)]"
                  >
                    <div>
                      <CardTitle className="text-lg">Campos detectados</CardTitle>
                      <CardDescription>
                        Se detectaron {azureResult.keyValuePairs?.length || 0} pares clave-valor.
                      </CardDescription>
                    </div>
                    {showKeyValuePairs ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>

                  {showKeyValuePairs && azureResult?.keyValuePairs && (
                    <CardContent className="border-t border-[var(--kt-gray-200)]">
                      <div className="max-h-96 space-y-2 overflow-y-auto">
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
              )}

              {uploadState === "ready" && azureResult && (
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
                      <CardDescription>Salida completa del analisis para depuracion y QA.</CardDescription>
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
              )}
            </aside>
          )}

          <div className="space-y-6">
            {shouldShowUploadLauncher && (
              <Card className="overflow-hidden border-[var(--kt-primary)]/25 bg-[linear-gradient(135deg,rgba(54,153,255,0.08),rgba(255,255,255,1))] shadow-[0_18px_40px_rgba(54,153,255,0.12)]">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--kt-primary)]">Carga guiada</p>
                      <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--kt-text-dark)]">
                        Sube el archivo PDF para iniciar el analisis
                      </h2>
                      <p className="text-sm leading-6 text-[var(--kt-text-muted)]">
                        Este flujo revisa el documento y prepara los datos para confirmacion antes de llevarlos al formulario.
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-3">
                      <Button
                        onClick={openFilePicker}
                        size="lg"
                        className="min-w-[240px] bg-[var(--kt-primary)] text-white hover:bg-[var(--kt-primary-dark)]"
                      >
                        <Upload className="mr-2 h-5 w-5" />
                        Subir archivo PDF
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/hojas-remision/edit/${documentId || ""}`)}
                        className="px-0 text-[var(--kt-text-muted)] hover:bg-transparent hover:text-[var(--kt-text-dark)]"
                      >
                        Prefiero editar campos manualmente
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(uploadState === "uploading" || uploadState === "analyzing" || uploadState === "saving") && (
              <Card className="overflow-hidden border-[var(--kt-gray-200)]">
                <CardContent className="py-8">
                  <LoadingSpinner
                    message={
                      uploadState === "uploading"
                        ? "Subiendo archivo..."
                        : uploadState === "analyzing"
                        ? "Analizando documento..."
                        : "Guardando en base de datos..."
                    }
                  />
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card className={`overflow-hidden border-l-4 ${file ? "border-l-[var(--kt-primary)]" : "border-l-[var(--kt-info)]"}`}>
                <CardContent className="py-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Modo de captura</p>
                  <p className="mt-2 text-base font-semibold text-[var(--kt-text-dark)]">
                    {file && extractedData ? "Edicion enriquecida con extraccion" : "Edicion manual guiada"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--kt-text-muted)]">
                    {file
                      ? "El PDF puede reescribir el contexto de la HR despues de la confirmacion."
                      : "Puedes editar el documento sin cargar un PDF nuevo."}
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-[var(--kt-gray-200)]">
                <CardContent className="py-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Decision operativa</p>
                  <p className="mt-2 text-base font-semibold text-[var(--kt-text-dark)]">
                    {uploadState === "ready" && extractedData ? "Extraccion lista para revisar" : "Formulario disponible para captura inmediata"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--kt-text-muted)]">
                    {uploadState === "ready" && extractedData
                      ? "Valida lo extraido antes de consolidar los cambios."
                      : "El guardado no depende del panel tecnico ni del visor PDF."}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden border-[var(--kt-gray-200)] shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <CardHeader className="border-b border-[var(--kt-gray-200)] bg-[linear-gradient(180deg,#f8fafc,white)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{file && extractedData ? "Formulario de consolidacion" : "Formulario maestro"}</CardTitle>
                    <CardDescription>
                      {file && extractedData
                        ? "Consolida la extraccion sobre los campos oficiales antes de guardar."
                        : "Captura los datos oficiales de la hoja de remision desde una sola superficie."}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-[var(--kt-gray-300)] bg-white text-[var(--kt-text-dark)]">
                      {mode === "edit" ? "HR existente" : "Nueva HR"}
                    </Badge>
                    {file && extractedData && (
                      <Badge className="bg-[var(--kt-primary-light)] text-[var(--kt-primary)]">
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        Extraccion lista
                      </Badge>
                    )}
                  </div>
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
              <Card className="overflow-hidden border-[var(--kt-primary)]/20 bg-[linear-gradient(135deg,white,var(--kt-primary-light))]">
                <CardHeader>
                  <CardTitle>Extraccion disponible</CardTitle>
                  <CardDescription>
                    El PDF fue analizado. Puedes revisar la confirmacion o continuar directamente con la captura manual.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={() => setWizardStep("confirmation")}>Revisar extraccion</Button>
                  <Button variant="outline" onClick={handleRetryUpload}>
                    Subir otro PDF
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {showPdfPanel && !prioritizePdfColumn && (
            <aside className="space-y-4 xl:sticky xl:top-28">
              <Card className="overflow-hidden border-[var(--kt-gray-200)] bg-white shadow-lg">
                <button
                  onClick={() => setShowPDF((prev) => !prev)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--kt-gray-50)]"
                >
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-5 w-5" />
                      Evidencia PDF
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
                    <div className="mb-4 rounded-xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Referencia visual</p>
                      <p className="mt-2 text-sm font-medium text-[var(--kt-text-dark)]">
                        {file ? "PDF cargado en esta sesion" : "PDF ya registrado en el sistema"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--kt-text-muted)]">
                        El visor permanece como apoyo documental mientras editas.
                      </p>
                    </div>
                    <div className="h-[72vh] min-h-[480px]">
                      <PDFViewer file={file} src={existingPdfSrc} />
                    </div>
                  </CardContent>
                )}
              </Card>

              {file && (
                <Card className="overflow-hidden border-[var(--kt-gray-200)]">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-[var(--kt-primary)]" />
                        <div>
                          <p className="text-sm font-medium text-[var(--kt-text-dark)]">{fileLabel}</p>
                          <p className="text-xs text-[var(--kt-text-muted)]">
                            Puedes descartar este reemplazo y volver al PDF original.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetUploadState}
                        className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {uploadState === "ready" && azureResult && (
                <Card className="overflow-hidden border-[var(--kt-gray-200)]">
                  <div className="border-b border-[var(--kt-gray-200)] px-6 py-4">
                    <CardTitle className="text-lg">Panel tecnico</CardTitle>
                    <CardDescription>Soporte de QA y validacion, fuera del flujo principal de captura.</CardDescription>
                  </div>
                </Card>
              )}

              {uploadState === "ready" && azureResult && (
                <Card>
                  <button
                    onClick={() => setShowKeyValuePairs((prev) => !prev)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--kt-gray-50)]"
                  >
                    <div>
                      <CardTitle className="text-lg">Campos detectados</CardTitle>
                      <CardDescription>
                        Se detectaron {azureResult.keyValuePairs?.length || 0} pares clave-valor.
                      </CardDescription>
                    </div>
                    {showKeyValuePairs ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                  </button>

                  {showKeyValuePairs && azureResult?.keyValuePairs && (
                    <CardContent className="border-t border-[var(--kt-gray-200)]">
                      <div className="max-h-96 space-y-2 overflow-y-auto">
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
              )}

              {uploadState === "ready" && azureResult && (
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
                      <CardDescription>Salida completa del analisis para depuracion y QA.</CardDescription>
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
              )}
            </aside>
          )}
        </div>
      )}

      {wizardStep === "confirmation" && extractedData && file && (
        <Suspense fallback={<LoadingSpinner message="Cargando confirmacion..." />}>
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
