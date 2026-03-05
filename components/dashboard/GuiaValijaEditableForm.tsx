"use client"

import React, { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Icon from "@/components/ui/Icon"
import GuiaValijaItems from "./GuiaValijaItems"
import { toast } from "sonner"
import { ArrowLeft, Save, X, AlertCircle, Upload, FileText, Eye, ChevronDown, ChevronUp } from "lucide-react"
import { guiaValijaSchema, GuiaValijaFormData } from "@/lib/schemas/guia-valija"
import { cn } from "@/lib/utils"
import { useUnsavedChanges } from "@/lib/hooks/useUnsavedChanges"

interface GuiaValijaEditableFormProps {
  guia?: any
  onSuccess?: () => void
  onCancel?: () => void
}

interface GuiaValijaItem {
  numeroItem: number
  destinatario: string
  contenido: string
  remitente?: string
  cantidad?: number
  peso?: number
}

const estadoOptions = [
  { value: "recibido", label: "Recibido" },
  { value: "en_transito", label: "En Tránsito" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
]

export default function GuiaValijaEditableForm({ guia, onSuccess, onCancel }: GuiaValijaEditableFormProps) {
  const router = useRouter()
  const [items, setItems] = useState<GuiaValijaItem[]>([])
  const [serverError, setServerError] = useState("")
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(guia?.filePath || null)
  const [showPdfPreview, setShowPdfPreview] = useState(true)
  const validateRef = useRef<{ validate: () => boolean } | null>(null)
  const pdfInputRef = useRef<HTMLInputElement | null>(null)

  // Cargar items si se está editando una guía existente
  useEffect(() => {
    if (guia?.items) {
      setItems(guia.items)
    }
  }, [guia])

  // Configurar react-hook-form con validación Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setValue,
    watch,
    trigger,
  } = useForm<GuiaValijaFormData>({
    resolver: zodResolver(guiaValijaSchema),
    mode: "onChange", // Validación en tiempo real
    defaultValues: {
      numeroGuia: guia?.numeroGuia || "",
      tipoValija: guia?.tipoValija || "ENTRADA",
      fechaEmision: guia?.fechaEmision ? new Date(guia.fechaEmision).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      fechaEnvio: guia?.fechaEnvio ? new Date(guia.fechaEnvio).toISOString().split('T')[0] : "",
      fechaRecibo: guia?.fechaRecibo ? new Date(guia.fechaRecibo).toISOString().split('T')[0] : "",
      origenCiudad: guia?.origenCiudad || "No especificado",
      origenPais: guia?.origenPais || "Perú",
      destinoCiudad: guia?.destinoCiudad || "",
      destinoPais: guia?.destinoPais || "",
      remitenteNombre: guia?.remitenteNombre || "",
      destinatarioNombre: guia?.destinatarioNombre || "",
      pesoValija: guia?.pesoValija || undefined,
      pesoOficial: guia?.pesoOficial || undefined,
      numeroPaquetes: guia?.numeroPaquetes || undefined,
      observaciones: guia?.observaciones || "",
      preparadoPor: guia?.preparadoPor || "",
      revisadoPor: guia?.revisadoPor || "",
      firmaReceptor: guia?.firmaReceptor || "",
      estado: guia?.estado || "recibido",
      items: guia?.items || []
    }
  })

  // Validar items cuando cambian
  useEffect(() => {
    if (items.length > 0) {
      setValue("items", items as any)
      trigger("items")
    }
  }, [items, setValue, trigger])

  useEffect(() => {
    setCurrentFilePath(guia?.filePath || null)
  }, [guia?.filePath])

  // Confirmación de cambios no guardados
  useUnsavedChanges({
    hasUnsavedChanges: isDirty,
    message: "Tienes cambios sin guardar en la guía de valija. Si sales, perderás estos cambios.",
  })

  const onSubmit = async (data: GuiaValijaFormData) => {
    setServerError("")

    try {
      const url = `/api/dashboard/guias-valija/${guia.id}`

      const payload = {
        ...data,
        items: items,
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        // Manejar errores específicos del servidor
        if (result.error) {
          if (result.error.includes("duplicate key")) {
            throw new Error("El número de guía ya existe. Usa otro número.")
          }
          throw new Error(result.error)
        }
        throw new Error("Error al guardar la guía")
      }

      toast.success("Guía actualizada correctamente", {
        description: `La guía ${data.numeroGuia} ha sido guardada exitosamente.`
      })

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/dashboard/guias-valija")
      }
    } catch (err: any) {
      const errorMessage = err.message || "Error al guardar la guía"
      setServerError(errorMessage)
      toast.error("Error al guardar", {
        description: errorMessage
      })
    }
  }

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(onSubmit)()
  }

  const uploadPdf = async () => {
    if (!selectedPdf || !guia?.id) {
      toast.error("Selecciona un archivo PDF antes de subir")
      return
    }

    setIsUploadingPdf(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedPdf)

      const response = await fetch(`/api/dashboard/guias-valija/${guia.id}/file`, {
        method: "POST",
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "No se pudo subir el PDF")
      }

      setCurrentFilePath(result.filePath || null)
      setSelectedPdf(null)
      if (pdfInputRef.current) {
        pdfInputRef.current.value = ""
      }

      toast.success("PDF actualizado correctamente")
    } catch (error: any) {
      toast.error("Error al subir PDF", {
        description: error?.message || "No se pudo actualizar el archivo",
      })
    } finally {
      setIsUploadingPdf(false)
    }
  }

  return (
    <form
      onSubmit={onFormSubmit}
      className="space-y-8 bg-[var(--kt-bg-light)] p-6 min-h-screen lg:pr-[56%]"
    >
      {/* Server Errors */}
      {serverError && (
        <Alert variant="destructive" className="bg-[var(--kt-danger-light)] border-[var(--kt-danger)] text-[var(--kt-danger)]">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al guardar</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* Form Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errores de validación</AlertTitle>
          <AlertDescription>
            Por favor, corrige los siguientes errores antes de continuar:
            <ul className="list-disc list-inside mt-2 space-y-1">
              {Object.entries(errors).slice(0, 5).map(([field, error]) => (
                <li key={field} className="text-sm">
                  <strong>{field}:</strong> {error?.message}
                </li>
              ))}
              {Object.keys(errors).length > 5 && (
                <li className="text-sm italic">
                  ...y {Object.keys(errors).length - 5} errores más
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">
              Editar Guía de Valija
            </h1>
            <p className="text-[var(--kt-text-muted)]">
              Número: {watch("numeroGuia")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)] shadow-sm"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="border-[var(--kt-primary)]/30 bg-gradient-to-r from-white to-blue-50/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-[var(--kt-primary)]" />
            Documento PDF de la guía
          </CardTitle>
          <CardDescription>
            Adjunta o reemplaza el PDF fuente. Se guarda al instante, sin esperar “Guardar Cambios”.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentFilePath ? (
            <div className="flex flex-col gap-2 rounded-md border bg-white p-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm">
                <p className="font-medium text-[var(--kt-text-dark)]">Archivo actual adjunto</p>
                <p className="text-[var(--kt-text-muted)] break-all">{currentFilePath}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(`/api/files/${currentFilePath}?inline=true`, "_blank")}
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver PDF
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-white p-3 text-sm text-[var(--kt-text-muted)]">
              Esta guía todavía no tiene PDF adjunto.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              disabled={isSubmitting || isUploadingPdf}
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                  toast.error("Solo se permiten archivos PDF")
                  e.target.value = ""
                  return
                }
                setSelectedPdf(file)
              }}
            />
            <Button
              type="button"
              onClick={uploadPdf}
              disabled={!selectedPdf || isUploadingPdf || isSubmitting}
              className="min-w-40"
            >
              {isUploadingPdf ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir PDF
                </>
              )}
            </Button>
          </div>

          {selectedPdf && (
            <p className="text-xs text-[var(--kt-text-muted)]">
              Seleccionado: <span className="font-medium">{selectedPdf.name}</span> (
              {(selectedPdf.size / 1024).toFixed(1)} KB)
            </p>
          )}

        </CardContent>
      </Card>

      {currentFilePath && (
        <Card className="border-[var(--kt-primary)]/30 bg-white lg:fixed lg:right-0 lg:top-24 lg:w-[55%] lg:shadow-xl">
          <CardHeader className="pb-2">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-sm font-medium text-[var(--kt-text-dark)]"
              onClick={() => setShowPdfPreview((prev) => !prev)}
            >
              <span>Vista previa del PDF</span>
              {showPdfPreview ? (
                <ChevronUp className="h-4 w-4 text-[var(--kt-text-muted)]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[var(--kt-text-muted)]" />
              )}
            </button>
          </CardHeader>
          {showPdfPreview && (
            <CardContent className="pt-0">
              <iframe
                src={`/api/files/${currentFilePath}?inline=true`}
                title="Vista previa del PDF de la guía"
                className="h-[62vh] w-full rounded-md border"
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Icon name="suitcase" className="h-5 w-5 text-[var(--kt-primary)]" />
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Tipo</p>
                <Badge className="bg-blue-100 text-blue-700">Entrada</Badge>
                <input type="hidden" name="tipoValija" value="ENTRADA" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Icon name="calendar" className="h-5 w-5 text-[var(--kt-info)]" />
              <div className="flex-1">
                <p className="text-xs text-[var(--kt-text-muted)]">Emisión</p>
                <Input
                  type="date"
                  {...register("fechaEmision")}
                  disabled={isSubmitting}
                  className={cn(
                    "mt-1",
                    errors.fechaEmision && "border-red-500 focus-visible:ring-red-500"
                  )}
                  aria-invalid={errors.fechaEmision ? "true" : "false"}
                  aria-describedby={errors.fechaEmision ? "fechaEmision-error" : undefined}
                />
                {errors.fechaEmision && (
                  <p id="fechaEmision-error" className="text-xs text-red-600 mt-1">
                    {errors.fechaEmision.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Icon name="truck" className="h-5 w-5 text-[var(--kt-warning)]" />
              <div className="flex-1">
                <p className="text-xs text-[var(--kt-text-muted)]">Estado</p>
                <Select
                  value={watch("estado")}
                  onValueChange={(v) => {
                    setValue("estado", v as any)
                    trigger("estado")
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    className={cn(
                      "w-32",
                      errors.estado && "border-red-500"
                    )}
                    aria-invalid={errors.estado ? "true" : "false"}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {estadoOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.estado && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.estado.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Icon name="weight" className="h-5 w-5 text-[var(--kt-success)]" />
              <div className="flex-1">
                <p className="text-xs text-[var(--kt-text-muted)]">Peso Total</p>
                <Input
                  type="number"
                  step="0.01"
                  {...register("pesoValija", { valueAsNumber: true })}
                  disabled={isSubmitting}
                  placeholder="63.810"
                  className={cn(
                    "mt-1",
                    errors.pesoValija && "border-red-500 focus-visible:ring-red-500"
                  )}
                  aria-invalid={errors.pesoValija ? "true" : "false"}
                  aria-describedby={errors.pesoValija ? "pesoValija-error" : undefined}
                />
                {errors.pesoValija && (
                  <p id="pesoValija-error" className="text-xs text-red-600 mt-1">
                    {errors.pesoValija.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Journey Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="mapPin" className="h-5 w-5" />
            Ruta de la Valija
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-[var(--kt-text-dark)] mb-4">Origen</h3>
              <div className="space-y-4">
                <input type="hidden" {...register("origenCiudad")} />
                <div>
                  <Label htmlFor="origenPais">
                    País Origen <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="origenPais"
                    {...register("origenPais")}
                    disabled={isSubmitting}
                    placeholder="Perú"
                    className={cn(
                      errors.origenPais && "border-red-500 focus-visible:ring-red-500"
                    )}
                    aria-invalid={errors.origenPais ? "true" : "false"}
                    aria-describedby={errors.origenPais ? "origenPais-error" : undefined}
                  />
                  {errors.origenPais && (
                    <p id="origenPais-error" className="text-xs text-red-600 mt-1">
                      {errors.origenPais.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="fechaEnvio">Fecha de Envío</Label>
                  <Input
                    id="fechaEnvio"
                    type="date"
                    {...register("fechaEnvio")}
                    disabled={isSubmitting}
                    className={cn(
                      errors.fechaEnvio && "border-red-500 focus-visible:ring-red-500"
                    )}
                    aria-invalid={errors.fechaEnvio ? "true" : "false"}
                    aria-describedby={errors.fechaEnvio ? "fechaEnvio-error" : undefined}
                  />
                  {errors.fechaEnvio && (
                    <p id="fechaEnvio-error" className="text-xs text-red-600 mt-1">
                      {errors.fechaEnvio.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-[var(--kt-text-dark)] mb-4">Destino</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="destinoCiudad">
                    Ciudad Destino <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="destinoCiudad"
                    {...register("destinoCiudad")}
                    disabled={isSubmitting}
                    placeholder="Tokio"
                    className={cn(
                      errors.destinoCiudad && "border-red-500 focus-visible:ring-red-500"
                    )}
                    aria-invalid={errors.destinoCiudad ? "true" : "false"}
                    aria-describedby={errors.destinoCiudad ? "destinoCiudad-error" : undefined}
                  />
                  {errors.destinoCiudad && (
                    <p id="destinoCiudad-error" className="text-xs text-red-600 mt-1">
                      {errors.destinoCiudad.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="destinoPais">
                    País Destino <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="destinoPais"
                    {...register("destinoPais")}
                    disabled={isSubmitting}
                    placeholder="Japón"
                    className={cn(
                      errors.destinoPais && "border-red-500 focus-visible:ring-red-500"
                    )}
                    aria-invalid={errors.destinoPais ? "true" : "false"}
                    aria-describedby={errors.destinoPais ? "destinoPais-error" : undefined}
                  />
                  {errors.destinoPais && (
                    <p id="destinoPais-error" className="text-xs text-red-600 mt-1">
                      {errors.destinoPais.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="fechaRecibo">Fecha de Recepción</Label>
                  <Input
                    id="fechaRecibo"
                    type="date"
                    {...register("fechaRecibo")}
                    disabled={isSubmitting}
                    className={cn(
                      errors.fechaRecibo && "border-red-500 focus-visible:ring-red-500"
                    )}
                    aria-invalid={errors.fechaRecibo ? "true" : "false"}
                    aria-describedby={errors.fechaRecibo ? "fechaRecibo-error" : undefined}
                  />
                  {errors.fechaRecibo && (
                    <p id="fechaRecibo-error" className="text-xs text-red-600 mt-1">
                      {errors.fechaRecibo.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* People Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="user" className="h-5 w-5" />
              Remitente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="remitenteNombre">Nombre</Label>
              <Input
                id="remitenteNombre"
                {...register("remitenteNombre")}
                disabled={isSubmitting}
                placeholder="Juan Pérez"
                className={cn(
                  errors.remitenteNombre && "border-red-500 focus-visible:ring-red-500"
                )}
                aria-invalid={errors.remitenteNombre ? "true" : "false"}
                aria-describedby={errors.remitenteNombre ? "remitenteNombre-error" : undefined}
              />
              {errors.remitenteNombre && (
                <p id="remitenteNombre-error" className="text-xs text-red-600 mt-1">
                  {errors.remitenteNombre.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="user" className="h-5 w-5" />
              Destinatario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="destinatarioNombre">Nombre</Label>
              <Input
                id="destinatarioNombre"
                {...register("destinatarioNombre")}
                disabled={isSubmitting}
                placeholder="María González"
                className={cn(
                  errors.destinatarioNombre && "border-red-500 focus-visible:ring-red-500"
                )}
                aria-invalid={errors.destinatarioNombre ? "true" : "false"}
                aria-describedby={errors.destinatarioNombre ? "destinatarioNombre-error" : undefined}
              />
              {errors.destinatarioNombre && (
                <p id="destinatarioNombre-error" className="text-xs text-red-600 mt-1">
                  {errors.destinatarioNombre.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="package" className="h-5 w-5" />
            Detalles de la Valija
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pesoOficial">Peso Oficial (kg)</Label>
              <Input
                id="pesoOficial"
                type="number"
                step="0.01"
                {...register("pesoOficial", { valueAsNumber: true })}
                disabled={isSubmitting}
                placeholder="69.200"
                className={cn(
                  errors.pesoOficial && "border-red-500 focus-visible:ring-red-500"
                )}
                aria-invalid={errors.pesoOficial ? "true" : "false"}
                aria-describedby={errors.pesoOficial ? "pesoOficial-error" : undefined}
              />
              {errors.pesoOficial && (
                <p id="pesoOficial-error" className="text-xs text-red-600 mt-1">
                  {errors.pesoOficial.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="numeroPaquetes">Número de Paquetes</Label>
              <Input
                id="numeroPaquetes"
                type="number"
                {...register("numeroPaquetes", { valueAsNumber: true })}
                disabled={isSubmitting}
                placeholder="5"
                className={cn(
                  errors.numeroPaquetes && "border-red-500 focus-visible:ring-red-500"
                )}
                aria-invalid={errors.numeroPaquetes ? "true" : "false"}
                aria-describedby={errors.numeroPaquetes ? "numeroPaquetes-error" : undefined}
              />
              {errors.numeroPaquetes && (
                <p id="numeroPaquetes-error" className="text-xs text-red-600 mt-1">
                  {errors.numeroPaquetes.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              {...register("observaciones")}
              disabled={isSubmitting}
              placeholder="Observaciones adicionales..."
              rows={2}
              className={cn(
                errors.observaciones && "border-red-500 focus-visible:ring-red-500"
              )}
              aria-invalid={errors.observaciones ? "true" : "false"}
              aria-describedby={errors.observaciones ? "observaciones-error" : undefined}
            />
            {errors.observaciones && (
              <p id="observaciones-error" className="text-xs text-red-600 mt-1">
                {errors.observaciones.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Items Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="package" className="h-5 w-5" />
            Items de la Guía ({items.length})
          </CardTitle>
          <CardDescription>
            Lista completa de items contenidos en la guía de valija
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GuiaValijaItems
            items={items}
            onChange={setItems}
            validateRef={validateRef}
            editable={true}
            title="Items de la Guía de Valija"
          />
        </CardContent>
      </Card>
    </form>
  )
}
