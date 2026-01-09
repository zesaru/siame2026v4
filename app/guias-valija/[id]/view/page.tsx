"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Package, MapPin, User, Calendar, Weight, Truck, Save, X, Trash2, MoreVertical } from "lucide-react"
import { toast } from "sonner"
import GuiaValijaItems from "@/components/dashboard/GuiaValijaItems"
import Icon from "@/components/ui/Icon"

interface GuiaValijaItem {
  id: string
  numeroItem: number
  destinatario: string
  contenido: string
  remitente?: string
  cantidad?: number
  peso?: number
}

interface GuiaValijaDetails {
  id: string
  numeroGuia: string
  tipoValija: string
  estado: string
  fechaEmision: string
  fechaEnvio?: string
  fechaRecibo?: string
  pesoValija?: number
  pesoOficial?: number
  numeroPaquetes?: number
  remitenteNombre?: string
  remitenteCargo?: string
  remitenteEmail?: string
  destinatarioNombre?: string
  destinatarioCargo?: string
  destinatarioEmail?: string
  origenCiudad?: string
  origenPais?: string
  destinoCiudad?: string
  destinoPais?: string
  descripcionContenido?: string
  observaciones?: string
  items: GuiaValijaItem[]
  createdAt: string
}

export default function GuiaValijaViewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [guia, setGuia] = useState<GuiaValijaDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [items, setItems] = useState<GuiaValijaItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const validateRef = useRef<{ validate: () => boolean } | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/auth/signin")
      return
    }
    fetchGuiaDetails()
  }, [session, status, params.id])

  async function fetchGuiaDetails() {
    try {
      const response = await fetch(`/api/guias-valija/${params.id}`)
      if (!response.ok) throw new Error("Error al cargar los detalles de la guía")
      const data = await response.json()
      setGuia(data)
      if (data.items) {
        setItems(data.items)
      }
    } catch (error) {
      toast.error("Error al cargar los detalles de la guía")
    } finally {
      setLoading(false)
    }
  }

  // Actualizar items cuando la guía cambie
  useEffect(() => {
    if (guia?.items) {
      setItems(guia.items)
    }
  }, [guia])

  async function saveItems() {
    if (!validateRef.current?.validate()) {
      setError("Hay errores en los items. Por favor corrígelos.")
      return
    }

    setSaving(true)
    setError("")
    try {
      const response = await fetch(`/api/guias-valija/${guia.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...guia, items })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar items")
      }

      // Actualizar la guía con los nuevos datos
      setGuia(data)
      setIsEditing(false)
      toast.success("Items actualizados correctamente")
    } catch (error: any) {
      setError(error.message || "Error al guardar items")
      toast.error(error.message || "Error al guardar items")
    } finally {
      setSaving(false)
    }
  }

  const cancelEditing = () => {
    // Restaurar items originales
    if (guia?.items) {
      setItems(guia.items)
    }
    setIsEditing(false)
    setError("")
  }

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/guias-valija/${params.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Error al eliminar la guía")

      toast.success("Guía eliminada correctamente")
      setDeleteConfirm(false)
      router.push("/dashboard/guias-valija")
    } catch (error) {
      toast.error("Error al eliminar la guía")
    }
  }

  const estadoColors: Record<string, string> = {
    pendiente: "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]",
    en_transito: "bg-blue-100 text-blue-700",
    entregado: "bg-[var(--kt-success-light)] text-[var(--kt-success)]",
    cancelado: "bg-[var(--kt-danger-light)] text-[var(--kt-danger)]",
  }

  const estadoLabels: Record<string, string> = {
    pendiente: "Pendiente",
    en_transito: "En Tránsito",
    entregado: "Entregado",
    cancelado: "Cancelado",
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--kt-text-muted)]">Cargando detalles...</p>
        </div>
      </div>
    )
  }

  if (!guia) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-[var(--kt-text-dark)] mb-2">Guía no encontrada</h2>
        <p className="text-[var(--kt-text-muted)] mb-4">No se pudo cargar la guía de valija solicitada</p>
        <Button onClick={() => router.back()}>
          Volver atrás
        </Button>
      </div>
    )
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
              Detalles de Guía de Valija
            </h1>
            <p className="text-[var(--kt-text-muted)]">
              Número: {guia.numeroGuia}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/guias-valija/${guia.id}/edit`)}
              >
                Editar Guía
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteConfirm(true)}
                className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)] hover:bg-[var(--kt-danger-light)]"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[var(--kt-primary)]" />
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Tipo</p>
                <Badge className="bg-[var(--kt-info-light)] text-[var(--kt-info)]">
                  GUÍA DE VALIJA {guia.numeroGuia?.split('-')[0]?.replace('EXT', '')} ENTRADA{guia.isExtraordinaria && ' EXTRAORDINARIA'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[var(--kt-info)]" />
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Emisión</p>
                <p className="text-sm font-medium">
                  {new Date(guia.fechaEmision).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[var(--kt-warning)]" />
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Estado</p>
                <Badge className={estadoColors[guia.estado]}>
                  {estadoLabels[guia.estado] || guia.estado}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Weight className="h-5 w-5 text-[var(--kt-success)]" />
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Peso Total</p>
                <p className="text-sm font-medium">
                  {guia.pesoValija ? `${guia.pesoValija} kg` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Journey Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ruta de la Valija
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-[var(--kt-text-dark)] mb-3">Origen</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--kt-text-muted)]" />
                  <span className="text-sm">
                    {guia.origenCiudad || "No especificado"}
                  </span>
                </div>
                {guia.origenPais && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--kt-text-muted)]" />
                    <span className="text-sm">{guia.origenPais}</span>
                  </div>
                )}
                {guia.fechaEnvio && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--kt-text-muted)]" />
                    <span className="text-sm">
                      Enviado: {new Date(guia.fechaEnvio).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-[var(--kt-text-dark)] mb-3">Destino</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--kt-text-muted)]" />
                  <span className="text-sm">
                    {guia.destinoCiudad || "No especificado"}
                  </span>
                </div>
                {guia.destinoPais && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--kt-text-muted)]" />
                    <span className="text-sm">{guia.destinoPais}</span>
                  </div>
                )}
                {guia.fechaRecibo && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[var(--kt-text-muted)]" />
                    <span className="text-sm">
                      Recibido: {new Date(guia.fechaRecibo).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* People Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Remitente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{guia.remitenteNombre || "No especificado"}</p>
            <p className="text-sm text-[var(--kt-text-muted)]">{guia.remitenteCargo || ""}</p>
            <p className="text-sm text-[var(--kt-text-muted)]">{guia.remitenteEmail || ""}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Destinatario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{guia.destinatarioNombre || "No especificado"}</p>
            <p className="text-sm text-[var(--kt-text-muted)]">{guia.destinatarioCargo || ""}</p>
            <p className="text-sm text-[var(--kt-text-muted)]">{guia.destinatarioEmail || ""}</p>
          </CardContent>
        </Card>
      </div>

      {/* Items Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items de la Guía ({guia.items.length})
          </CardTitle>
          <CardDescription>
            Lista completa de items contenidos en la guía de valija
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GuiaValijaItems
          title="Items de la Guía"
          items={items}
          onChange={setItems}
          validateRef={validateRef}
          editable={isEditing}
        />
        </CardContent>
      </Card>

      {/* Additional Info */}
      {(guia.descripcionContenido || guia.observaciones) && (
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {guia.descripcionContenido && (
              <div>
                <h4 className="font-medium text-[var(--kt-text-dark)] mb-2">Descripción del Contenido</h4>
                <p className="text-sm text-[var(--kt-text-muted)]">{guia.descripcionContenido}</p>
              </div>
            )}
            {guia.observaciones && (
              <div>
                <h4 className="font-medium text-[var(--kt-text-dark)] mb-2">Observaciones</h4>
                <p className="text-sm text-[var(--kt-text-muted)]">{guia.observaciones}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          {error && (
            <div className="mb-4">
              <div className="bg-[var(--kt-danger-light)] border border-[var(--kt-danger)] text-[var(--kt-danger)] px-4 py-3 rounded">
                {error}
              </div>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/dashboard/guias-valija")}>
                Volver al listado
              </Button>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <Package className="h-4 w-4 mr-2" />
                  Editar Items
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={saveItems} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Guía de Valija</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la guía de valija <strong>{guia?.numeroGuia}</strong>?
              Esta acción no se puede deshacer y se eliminarán todos los items y precintos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[var(--kt-danger)] hover:bg-[var(--kt-danger-dark)]"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}