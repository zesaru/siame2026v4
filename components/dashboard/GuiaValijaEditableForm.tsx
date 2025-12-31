"use client"

import React, { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Icon from "@/components/ui/Icon"
import GuiaValijaItems from "./GuiaValijaItems"
import { toast } from "sonner"
import { ArrowLeft, Save, X } from "lucide-react"

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
  { value: "pendiente", label: "Pendiente" },
  { value: "en_transito", label: "En Tránsito" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
]

export default function GuiaValijaEditableForm({ guia, onSuccess, onCancel }: GuiaValijaEditableFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState<GuiaValijaItem[]>([])
  const validateRef = useRef<{ validate: () => boolean } | null>(null)

  // Cargar items si se está editando una guía existente
  React.useEffect(() => {
    if (guia?.items) {
      setItems(guia.items)
    }
  }, [guia])

  const [formData, setFormData] = useState({
    id: guia?.id || "",
    numeroGuia: guia?.numeroGuia || "",
    tipoValija: guia?.tipoValija || "ENTRADA",
    fechaEmision: guia?.fechaEmision ? new Date(guia.fechaEmision).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    fechaEnvio: guia?.fechaEnvio ? new Date(guia.fechaEnvio).toISOString().split('T')[0] : "",
    fechaRecibo: guia?.fechaRecibo ? new Date(guia.fechaRecibo).toISOString().split('T')[0] : "",
    origenCiudad: guia?.origenCiudad || "",
    destinoCiudad: guia?.destinoCiudad || "",
    origenPais: guia?.origenPais || "Perú",
    destinoPais: guia?.destinoPais || "",
    remitenteNombre: guia?.remitenteNombre || "",
    destinatarioNombre: guia?.destinatarioNombre || "",
    pesoValija: guia?.pesoValija || "",
    pesoOficial: guia?.pesoOficial || "",
    numeroPaquetes: guia?.numeroPaquetes || "",
    observaciones: guia?.observaciones || "",
    preparadoPor: guia?.preparadoPor || "",
    revisadoPor: guia?.revisadoPor || "",
    firmaReceptor: guia?.firmaReceptor || "",
    estado: guia?.estado || "pendiente",
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.numeroGuia.trim()) {
      setError("El número de guía es requerido")
      return false
    }
    if (!formData.tipoValija) {
      setError("El tipo de valija es requerido")
      return false
    }
    if (!formData.fechaEmision) {
      setError("La fecha de emisión es requerida")
      return false
    }

    // Validar items usando el ref
    if (validateRef.current?.validate()) {
      // Validación exitosa
    } else if (items.length === 0) {
      setError("Debe agregar al menos un item")
      return false
    }

    setError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setError("")
    setLoading(true)

    try {
      const url = `/api/dashboard/guias-valija/${guia.id}`

      const payload = {
        ...formData,
        items: items,
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar")
      }

      toast.success("Guía actualizada correctamente")

      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/dashboard/guias-valija")
      }
    } catch (err: any) {
      setError(err.message || "Error al guardar la guía")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-6 bg-[var(--kt-bg-light)] min-h-screen">
      {error && (
        <Alert variant="destructive" className="bg-[var(--kt-danger-light)] border-[var(--kt-danger)] text-[var(--kt-danger)]">
          <Icon name="alert" size="sm" className="mr-2" />
          <AlertDescription>{error}</AlertDescription>
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
              Número: {formData.numeroGuia}
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
            disabled={loading}
            className="bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)] shadow-sm"
          >
            {loading ? (
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
                  value={formData.fechaEmision}
                  onChange={(e) => handleChange("fechaEmision", e.target.value)}
                  disabled={loading}
                  className="mt-1"
                />
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
                  value={formData.estado}
                  onValueChange={(v) => handleChange("estado", v)}
                  disabled={loading}
                >
                  <SelectTrigger className="w-32">
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
                  value={formData.pesoValija}
                  onChange={(e) => handleChange("pesoValija", e.target.value)}
                  disabled={loading}
                  placeholder="63.810"
                  className="mt-1"
                />
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
                <div>
                  <Label htmlFor="origenCiudad">Ciudad Origen</Label>
                  <Input
                    id="origenCiudad"
                    value={formData.origenCiudad}
                    onChange={(e) => handleChange("origenCiudad", e.target.value)}
                    disabled={loading}
                    placeholder="Lima"
                  />
                </div>
                <div>
                  <Label htmlFor="origenPais">País Origen</Label>
                  <Input
                    id="origenPais"
                    value={formData.origenPais}
                    onChange={(e) => handleChange("origenPais", e.target.value)}
                    disabled={loading}
                    placeholder="Perú"
                  />
                </div>
                <div>
                  <Label htmlFor="fechaEnvio">Fecha de Envío</Label>
                  <Input
                    id="fechaEnvio"
                    type="date"
                    value={formData.fechaEnvio}
                    onChange={(e) => handleChange("fechaEnvio", e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-[var(--kt-text-dark)] mb-4">Destino</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="destinoCiudad">Ciudad Destino</Label>
                  <Input
                    id="destinoCiudad"
                    value={formData.destinoCiudad}
                    onChange={(e) => handleChange("destinoCiudad", e.target.value)}
                    disabled={loading}
                    placeholder="Tokio"
                  />
                </div>
                <div>
                  <Label htmlFor="destinoPais">País Destino</Label>
                  <Input
                    id="destinoPais"
                    value={formData.destinoPais}
                    onChange={(e) => handleChange("destinoPais", e.target.value)}
                    disabled={loading}
                    placeholder="Japón"
                  />
                </div>
                <div>
                  <Label htmlFor="fechaRecibo">Fecha de Recepción</Label>
                  <Input
                    id="fechaRecibo"
                    type="date"
                    value={formData.fechaRecibo}
                    onChange={(e) => handleChange("fechaRecibo", e.target.value)}
                    disabled={loading}
                  />
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
                value={formData.remitenteNombre}
                onChange={(e) => handleChange("remitenteNombre", e.target.value)}
                disabled={loading}
                placeholder="Juan Pérez"
              />
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
                value={formData.destinatarioNombre}
                onChange={(e) => handleChange("destinatarioNombre", e.target.value)}
                disabled={loading}
                placeholder="María González"
              />
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
                value={formData.pesoOficial}
                onChange={(e) => handleChange("pesoOficial", e.target.value)}
                disabled={loading}
                placeholder="69.200"
              />
            </div>
            <div>
              <Label htmlFor="numeroPaquetes">Número de Paquetes</Label>
              <Input
                id="numeroPaquetes"
                type="number"
                value={formData.numeroPaquetes}
                onChange={(e) => handleChange("numeroPaquetes", e.target.value)}
                disabled={loading}
                placeholder="5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => handleChange("observaciones", e.target.value)}
              disabled={loading}
              placeholder="Observaciones adicionales..."
              rows={2}
            />
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