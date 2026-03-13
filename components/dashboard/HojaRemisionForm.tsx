"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import RichTextEditor from "@/components/ui/RichTextEditor"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ParsedHojaRemisionData } from "@/lib/hojas-remision-parser"
import { HOJA_REMISION_STATUS, normalizeHojaRemisionEstado } from "@/lib/hoja-remision-status"
import { logger } from "@/lib/logger"

export interface HojaRemisionFormData {
  numero: number
  numeroCompleto: string
  siglaUnidad: string
  fecha: Date | string
  para: string
  remitente: string
  referencia?: string
  documento?: string
  asunto: string
  destino: string
  descripcionEmpaque?: string
  peso?: number
  estado: string
}

interface HojaRemisionFormProps {
  initialData?: Partial<HojaRemisionFormData> | ParsedHojaRemisionData
  onSave: (data: HojaRemisionFormData) => void
  onCancel: () => void
  submitLabel?: string
}

export default function HojaRemisionForm({
  initialData,
  onSave,
  onCancel,
  submitLabel = "Guardar Hoja de Remisión",
}: HojaRemisionFormProps) {
  const [formData, setFormData] = useState<HojaRemisionFormData>({
    numero: initialData?.numero || 0,
    numeroCompleto: initialData?.numeroCompleto || "",
    siglaUnidad: initialData?.siglaUnidad || "",
    fecha: initialData?.fecha || new Date(),
    para: initialData?.para || "",
    remitente: initialData?.remitente || "",
    referencia: initialData?.referencia || "",
    documento: initialData?.documento || "",
    asunto: initialData?.asunto || "",
    destino: initialData?.destino || "",
    descripcionEmpaque: initialData?.descripcionEmpaque || "",
    peso: initialData?.peso || undefined,
    estado: normalizeHojaRemisionEstado(initialData?.estado),
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!initialData) return

    setFormData({
      numero: initialData.numero || 0,
      numeroCompleto: initialData.numeroCompleto || "",
      siglaUnidad: initialData.siglaUnidad || "",
      fecha: initialData.fecha || new Date(),
      para: initialData.para || "",
      remitente: initialData.remitente || "",
      referencia: initialData.referencia || "",
      documento: initialData.documento || "",
      asunto: initialData.asunto || "",
      destino: initialData.destino || "",
      descripcionEmpaque: initialData.descripcionEmpaque || "",
      peso: initialData.peso || undefined,
      estado: normalizeHojaRemisionEstado(initialData.estado),
    })
  }, [initialData])

  const handleChange = (field: keyof HojaRemisionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.numeroCompleto.trim()) {
      newErrors.numeroCompleto = "Número completo es requerido"
    }
    if (!formData.siglaUnidad.trim()) {
      newErrors.siglaUnidad = "Sigla de unidad es requerida"
    }
    if (!formData.para.trim()) {
      newErrors.para = "Para es requerido"
    }
    if (!formData.remitente.trim()) {
      newErrors.remitente = "Remitente es requerido"
    }
    if (!formData.asunto || formData.asunto.trim() === "" || formData.asunto === "<p></p>") {
      newErrors.asunto = "Asunto es requerido"
    }
    if (!formData.destino.trim()) {
      newErrors.destino = "Destino es requerido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validate()) {
      onSave(formData)
    }
  }

  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return ""

    try {
      const dateObj = typeof date === "string" ? new Date(date) : date
      if (isNaN(dateObj.getTime())) {
        logger.warn(`Fecha invalida: ${String(date)}`)
        return ""
      }
      return dateObj.toISOString().split("T")[0]
    } catch (error) {
      logger.error("Error formateando fecha:", error)
      return ""
    }
  }

  const requiredCount = 6
  const completedRequiredCount = [
    formData.numeroCompleto,
    formData.siglaUnidad,
    formData.para,
    formData.remitente,
    formData.asunto && formData.asunto !== "<p></p>" ? "ok" : "",
    formData.destino,
  ].filter((value) => String(value || "").trim() !== "").length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="sticky top-24 z-10 rounded-[24px] border border-[var(--kt-gray-200)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_14px_35px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-[var(--kt-gray-300)] bg-white text-[var(--kt-text-dark)]">
                Captura oficial
              </Badge>
              <Badge className="bg-[var(--kt-primary-light)] text-[var(--kt-primary)]">
                {completedRequiredCount}/{requiredCount} campos clave
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--kt-text-dark)]">
                Completa primero identificacion, partes y destino.
              </p>
              <p className="text-xs text-[var(--kt-text-muted)]">
                Los campos secundarios quedan al final para no romper el ritmo de captura.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[var(--kt-primary)]">
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-[var(--kt-gray-200)]">
        <CardHeader className="border-b border-[var(--kt-gray-200)] bg-[linear-gradient(180deg,#f8fafc,white)]">
          <CardTitle>Cabecera operativa</CardTitle>
          <CardDescription>Número HR, unidad, fecha y estado en una sola línea de trabajo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]">
            <div>
              <Label htmlFor="numeroCompleto">
                Número Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="numeroCompleto"
                value={formData.numeroCompleto}
                onChange={(e) => handleChange("numeroCompleto", e.target.value)}
                className={errors.numeroCompleto ? "border-red-500 focus-visible:ring-red-500" : ""}
                placeholder="HR N°22-6-HH/12"
              />
              {errors.numeroCompleto && <p className="mt-1 text-sm text-red-500">{errors.numeroCompleto}</p>}
            </div>

            <div>
              <Label htmlFor="siglaUnidad">
                Sigla Unidad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="siglaUnidad"
                value={formData.siglaUnidad}
                onChange={(e) => handleChange("siglaUnidad", e.target.value.toUpperCase())}
                className={errors.siglaUnidad ? "border-red-500 focus-visible:ring-red-500" : ""}
                placeholder="HH"
                maxLength={10}
              />
              {errors.siglaUnidad && <p className="mt-1 text-sm text-red-500">{errors.siglaUnidad}</p>}
            </div>

            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={formatDateForInput(formData.fecha)}
                onChange={(e) => handleChange("fecha", new Date(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select value={formData.estado} onValueChange={(value) => handleChange("estado", value)}>
                <SelectTrigger id="estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={HOJA_REMISION_STATUS.PENDING_REVIEW}>SIN REVISAR</SelectItem>
                  <SelectItem value={HOJA_REMISION_STATUS.REVIEWED}>REVISADA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="overflow-hidden border-[var(--kt-gray-200)]">
          <CardHeader className="border-b border-[var(--kt-gray-200)] bg-white">
            <CardTitle>Partes y destino</CardTitle>
            <CardDescription>Bloque principal para ubicar a quien se dirige, quien remite y adonde viaja.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div>
              <Label htmlFor="para">
                Para <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="para"
                value={formData.para}
                onChange={(e) => handleChange("para", e.target.value)}
                className={errors.para ? "border-red-500 focus-visible:ring-red-500" : ""}
                placeholder="Nombre del destinatario"
                rows={3}
              />
              {errors.para && <p className="mt-1 text-sm text-red-500">{errors.para}</p>}
            </div>

            <div>
              <Label htmlFor="remitente">
                Remitente <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="remitente"
                value={formData.remitente}
                onChange={(e) => handleChange("remitente", e.target.value)}
                className={errors.remitente ? "border-red-500 focus-visible:ring-red-500" : ""}
                placeholder="Nombre del remitente"
                rows={3}
              />
              {errors.remitente && <p className="mt-1 text-sm text-red-500">{errors.remitente}</p>}
            </div>

            <div>
              <Label htmlFor="destino">
                Destino <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="destino"
                value={formData.destino}
                onChange={(e) => handleChange("destino", e.target.value)}
                className={errors.destino ? "border-red-500 focus-visible:ring-red-500" : ""}
                placeholder="Ciudad, pais de destino"
                rows={3}
              />
              {errors.destino && <p className="mt-1 text-sm text-red-500">{errors.destino}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-[var(--kt-gray-200)]">
          <CardHeader className="border-b border-[var(--kt-gray-200)] bg-white">
            <CardTitle>Contenido oficial</CardTitle>
            <CardDescription>Documento y asunto visibles en el mismo panel para redactar sin saltos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div>
              <Label htmlFor="documento">Documento</Label>
              <Textarea
                id="documento"
                value={formData.documento || ""}
                onChange={(e) => handleChange("documento", e.target.value)}
                placeholder="Descripción del documento (opcional)"
                rows={4}
                className={errors.documento ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.documento && <p className="mt-1 text-sm text-red-500">{errors.documento}</p>}
            </div>

            <div>
              <Label htmlFor="asunto">
                Asunto <span className="text-red-500">*</span>
              </Label>
              <RichTextEditor
                content={formData.asunto || ""}
                onChange={(html) => handleChange("asunto", html)}
                placeholder="Asunto del documento (puedes usar negrita, vietas, etc.)"
              />
              {errors.asunto && <p className="mt-1 text-sm text-red-500">{errors.asunto}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-[var(--kt-gray-200)]">
        <CardHeader className="border-b border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)]">
          <CardTitle>Datos complementarios</CardTitle>
          <CardDescription>Referencia y peso quedan al final porque no bloquean la captura principal.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="referencia">Referencia</Label>
              <Input
                id="referencia"
                value={formData.referencia || ""}
                onChange={(e) => handleChange("referencia", e.target.value)}
                placeholder="Número de referencia"
              />
            </div>

            <div>
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input
                id="peso"
                type="number"
                step="0.001"
                value={formData.peso || ""}
                onChange={(e) => handleChange("peso", e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.000"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="descripcionEmpaque">Descripción empaque</Label>
              <Input
                id="descripcionEmpaque"
                value={formData.descripcionEmpaque || ""}
                onChange={(e) => handleChange("descripcionEmpaque", e.target.value)}
                placeholder="Caja de carton, paquete, sobre, etc."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-20 flex justify-end gap-3 rounded-xl border border-[var(--kt-gray-200)] bg-white/95 p-3 shadow-sm backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-[var(--kt-primary)]">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
