"use client"

import { useState } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ParsedHojaRemisionData } from "@/lib/hojas-remision-parser"
import { logger } from "@/lib/logger"

interface HojaRemisionFormData {
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
  peso?: number
  estado: string
}

interface HojaRemisionFormProps {
  initialData?: ParsedHojaRemisionData
  onSave: (data: HojaRemisionFormData) => void
  onCancel: () => void
}

export default function HojaRemisionForm({
  initialData,
  onSave,
  onCancel,
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
    peso: initialData?.peso || undefined,
    estado: "borrador",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (
    field: keyof HojaRemisionFormData,
    value: any
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field
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
      newErrors.para = "Para (destinatario) es requerido"
    }
    if (!formData.remitente.trim()) {
      newErrors.remitente = "Remitente es requerido"
    }
    // documento es opcional
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
      let dateObj: Date

      if (typeof date === "string") {
        dateObj = new Date(date)
      } else {
        dateObj = date
      }

      // Validar que la fecha sea válida
      if (isNaN(dateObj.getTime())) {
        logger.warn("Fecha inválida:", date)
        return ""
      }

      return dateObj.toISOString().split("T")[0]
    } catch (error) {
      logger.error("Error formateando fecha:", error)
      return ""
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sección 1: Identificación */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="numeroCompleto">
                Número Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="numeroCompleto"
                value={formData.numeroCompleto}
                onChange={(e) =>
                  handleChange("numeroCompleto", e.target.value)
                }
                className={
                  errors.numeroCompleto
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
                placeholder="HR N°22-6-HH/12"
              />
              {errors.numeroCompleto && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.numeroCompleto}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="siglaUnidad">
                Sigla Unidad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="siglaUnidad"
                value={formData.siglaUnidad}
                onChange={(e) =>
                  handleChange("siglaUnidad", e.target.value.toUpperCase())
                }
                className={
                  errors.siglaUnidad
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }
                placeholder="HH"
                maxLength={10}
              />
              {errors.siglaUnidad && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.siglaUnidad}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={formatDateForInput(formData.fecha)}
                onChange={(e) =>
                  handleChange("fecha", new Date(e.target.value))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Partes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Partes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="para">
              Para (Destinatario) <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="para"
              value={formData.para}
              onChange={(e) => handleChange("para", e.target.value)}
              className={
                errors.para
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
              placeholder="Nombre del destinatario"
              rows={3}
            />
            {errors.para && (
              <p className="text-sm text-red-500 mt-1">{errors.para}</p>
            )}
          </div>

          <div>
            <Label htmlFor="remitente">
              Remitente <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="remitente"
              value={formData.remitente}
              onChange={(e) => handleChange("remitente", e.target.value)}
              className={
                errors.remitente
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
              placeholder="Nombre del remitente"
              rows={3}
            />
            {errors.remitente && (
              <p className="text-sm text-red-500 mt-1">{errors.remitente}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sección 3: Contenido */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contenido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="documento">
              Documento
            </Label>
            <Textarea
              id="documento"
              value={formData.documento || ""}
              onChange={(e) => handleChange("documento", e.target.value)}
              placeholder="Descripción del documento (opcional)"
              rows={4}
              className={
                errors.documento
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
            />
            {errors.documento && (
              <p className="text-sm text-red-500 mt-1">{errors.documento}</p>
            )}
          </div>

          <div>
            <Label htmlFor="asunto">
              Asunto <span className="text-red-500">*</span>
            </Label>
            <RichTextEditor
              content={formData.asunto || ""}
              onChange={(html) => handleChange("asunto", html)}
              placeholder="Asunto del documento (puedes usar negrita, viñetas, etc.)"
            />
            {errors.asunto && (
              <p className="text-sm text-red-500 mt-1">{errors.asunto}</p>
            )}
          </div>

          <div>
            <Label htmlFor="destino">
              Destino <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="destino"
              value={formData.destino}
              onChange={(e) => handleChange("destino", e.target.value)}
              className={
                errors.destino
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
              placeholder="Ciudad, país de destino"
              rows={3}
            />
            {errors.destino && (
              <p className="text-sm text-red-500 mt-1">{errors.destino}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sección 4: Adicionales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información Adicional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="referencia">Referencia</Label>
              <Input
                id="referencia"
                value={formData.referencia || ""}
                onChange={(e) =>
                  handleChange("referencia", e.target.value)
                }
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
                onChange={(e) =>
                  handleChange(
                    "peso",
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="0.000"
              />
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => handleChange("estado", value)}
              >
                <SelectTrigger id="estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="recibida">Recibida</SelectItem>
                  <SelectItem value="anulada">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-[var(--kt-primary)]">
          Guardar Hoja de Remisión
        </Button>
      </div>
    </form>
  )
}
