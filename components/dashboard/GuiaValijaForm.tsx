"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Icon from "@/components/ui/Icon"
import { toast } from "sonner"

interface GuiaValijaFormProps {
  guia?: any
  onSuccess?: () => void
  onCancel?: () => void
}

const tipoValijaOptions = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SALIDA", label: "Salida" },
]

const estadoOptions = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_transito", label: "En Tránsito" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
]

export default function GuiaValijaForm({ guia, onSuccess, onCancel }: GuiaValijaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    numeroGuia: guia?.numeroGuia || "",
    tipoValija: guia?.tipoValija || "SALIDA",
    fechaEmision: guia?.fechaEmision ? new Date(guia.fechaEmision).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    fechaEnvio: guia?.fechaEnvio ? new Date(guia.fechaEnvio).toISOString().split('T')[0] : "",
    fechaRecibo: guia?.fechaRecibo ? new Date(guia.fechaRecibo).toISOString().split('T')[0] : "",
    origenCiudad: guia?.origenCiudad || "",
    destinoCiudad: guia?.destinoCiudad || "",
    origenPais: guia?.origenPais || "Perú",
    destinoPais: guia?.destinoPais || "",
    remitenteNombre: guia?.remitenteNombre || "",
    remitenteCargo: guia?.remitenteCargo || "",
    remitenteEmail: guia?.remitenteEmail || "",
    destinatarioNombre: guia?.destinatarioNombre || "",
    destinatarioCargo: guia?.destinatarioCargo || "",
    destinatarioEmail: guia?.destinatarioEmail || "",
    pesoValija: guia?.pesoValija || "",
    pesoOficial: guia?.pesoOficial || "",
    numeroPaquetes: guia?.numeroPaquetes || "",
    descripcionContenido: guia?.descripcionContenido || "",
    observaciones: guia?.observaciones || "",
    preparadoPor: guia?.preparadoPor || "",
    revisadoPor: guia?.revisadoPor || "",
    firmaReceptor: guia?.firmaReceptor || "",
    estado: guia?.estado || "pendiente",
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const url = guia
        ? `/api/dashboard/guias-valija/${guia.id}`
        : "/api/dashboard/guias-valija"

      const response = await fetch(url, {
        method: guia ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar")
      }

      toast.success(guia ? "Guía actualizada correctamente" : "Guía creada correctamente")

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-[var(--kt-danger-light)] border-[var(--kt-danger)] text-[var(--kt-danger)]">
          <Icon name="alert" size="sm" className="mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Información Básica */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información Básica</CardTitle>
          <CardDescription>Campos obligatorios de la guía</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numeroGuia">Número de Guía *</Label>
              <Input
                id="numeroGuia"
                required
                value={formData.numeroGuia}
                onChange={(e) => handleChange("numeroGuia", e.target.value)}
                placeholder="GV-2026-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoValija">Tipo de Valija *</Label>
              <Select value={formData.tipoValija} onValueChange={(v) => handleChange("tipoValija", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tipoValijaOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaEmision">Fecha de Emisión *</Label>
              <Input
                id="fechaEmision"
                type="date"
                required
                value={formData.fechaEmision}
                onChange={(e) => handleChange("fechaEmision", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={formData.estado} onValueChange={(v) => handleChange("estado", v)}>
                <SelectTrigger>
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

      {/* Fechas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fechas de Tránsito</CardTitle>
          <CardDescription>Control de fechas de envío y recepción</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaEnvio">Fecha de Envío</Label>
              <Input
                id="fechaEnvio"
                type="date"
                value={formData.fechaEnvio}
                onChange={(e) => handleChange("fechaEnvio", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaRecibo">Fecha de Recepción</Label>
              <Input
                id="fechaRecibo"
                type="date"
                value={formData.fechaRecibo}
                onChange={(e) => handleChange("fechaRecibo", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ubicaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ubicaciones</CardTitle>
          <CardDescription>Origen y destino de la valija</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origenCiudad">Ciudad Origen</Label>
              <Input
                id="origenCiudad"
                value={formData.origenCiudad}
                onChange={(e) => handleChange("origenCiudad", e.target.value)}
                placeholder="Lima"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="origenPais">País Origen</Label>
              <Input
                id="origenPais"
                value={formData.origenPais}
                onChange={(e) => handleChange("origenPais", e.target.value)}
                placeholder="Perú"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinoCiudad">Ciudad Destino</Label>
              <Input
                id="destinoCiudad"
                value={formData.destinoCiudad}
                onChange={(e) => handleChange("destinoCiudad", e.target.value)}
                placeholder="Tokio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinoPais">País Destino</Label>
              <Input
                id="destinoPais"
                value={formData.destinoPais}
                onChange={(e) => handleChange("destinoPais", e.target.value)}
                placeholder="Japón"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personas Involucradas</CardTitle>
          <CardDescription>Remitente y destinatario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-[var(--kt-text-dark)] mb-3">Remitente</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="remitenteNombre">Nombre</Label>
                  <Input
                    id="remitenteNombre"
                    value={formData.remitenteNombre}
                    onChange={(e) => handleChange("remitenteNombre", e.target.value)}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remitenteCargo">Cargo</Label>
                  <Input
                    id="remitenteCargo"
                    value={formData.remitenteCargo}
                    onChange={(e) => handleChange("remitenteCargo", e.target.value)}
                    placeholder="Embajador"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remitenteEmail">Email</Label>
                  <Input
                    id="remitenteEmail"
                    type="email"
                    value={formData.remitenteEmail}
                    onChange={(e) => handleChange("remitenteEmail", e.target.value)}
                    placeholder="ejemplo@email.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-[var(--kt-text-dark)] mb-3">Destinatario</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="destinatarioNombre">Nombre</Label>
                  <Input
                    id="destinatarioNombre"
                    value={formData.destinatarioNombre}
                    onChange={(e) => handleChange("destinatarioNombre", e.target.value)}
                    placeholder="María González"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destinatarioCargo">Cargo</Label>
                  <Input
                    id="destinatarioCargo"
                    value={formData.destinatarioCargo}
                    onChange={(e) => handleChange("destinatarioCargo", e.target.value)}
                    placeholder="Cónsul"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destinatarioEmail">Email</Label>
                  <Input
                    id="destinatarioEmail"
                    type="email"
                    value={formData.destinatarioEmail}
                    onChange={(e) => handleChange("destinatarioEmail", e.target.value)}
                    placeholder="ejemplo@email.com"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalles de Valija */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalles de Valija</CardTitle>
          <CardDescription>Peso, paquetes y contenido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pesoValija">Peso Valija (kg)</Label>
              <Input
                id="pesoValija"
                type="number"
                step="0.01"
                value={formData.pesoValija}
                onChange={(e) => handleChange("pesoValija", e.target.value)}
                placeholder="63.810"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pesoOficial">Peso Oficial (kg)</Label>
              <Input
                id="pesoOficial"
                type="number"
                step="0.01"
                value={formData.pesoOficial}
                onChange={(e) => handleChange("pesoOficial", e.target.value)}
                placeholder="69.200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroPaquetes">Número de Paquetes</Label>
              <Input
                id="numeroPaquetes"
                type="number"
                value={formData.numeroPaquetes}
                onChange={(e) => handleChange("numeroPaquetes", e.target.value)}
                placeholder="5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcionContenido">Descripción del Contenido</Label>
            <Textarea
              id="descripcionContenido"
              value={formData.descripcionContenido}
              onChange={(e) => handleChange("descripcionContenido", e.target.value)}
              placeholder="Descripción detallada del contenido..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => handleChange("observaciones", e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Personal de Control */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal de Control</CardTitle>
          <CardDescription>Personas que preparan y revisan la valija</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preparadoPor">Preparado Por</Label>
              <Input
                id="preparadoPor"
                value={formData.preparadoPor}
                onChange={(e) => handleChange("preparadoPor", e.target.value)}
                placeholder="José Rios M."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="revisadoPor">Revisado Por</Label>
              <Input
                id="revisadoPor"
                value={formData.revisadoPor}
                onChange={(e) => handleChange("revisadoPor", e.target.value)}
                placeholder="Miguel Saavedra A."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firmaReceptor">Firma Receptor</Label>
              <Input
                id="firmaReceptor"
                value={formData.firmaReceptor}
                onChange={(e) => handleChange("firmaReceptor", e.target.value)}
                placeholder="VARGAS ALVAREZ"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading} className="bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)]">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Icon name="check" size="sm" className="mr-2" />
              {guia ? "Actualizar Guía" : "Crear Guía"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
