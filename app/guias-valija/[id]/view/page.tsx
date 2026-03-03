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
import { ArrowLeft, Package, MapPin, User, Calendar, Weight, Truck, Save, X, Trash2 } from "lucide-react"
import { toast } from "sonner"
import GuiaValijaItems from "@/components/dashboard/GuiaValijaItems"
import { withTrackView } from "@/lib/utils"

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
  isExtraordinaria?: boolean
  items: GuiaValijaItem[]
  createdAt: string
}

type TabKey = "resumen" | "items" | "personas" | "observaciones"

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
  const [activeTab, setActiveTab] = useState<TabKey>("resumen")
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
      const response = await fetch(withTrackView(`/api/guias-valija/${params.id}`, true))
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

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "resumen", label: "Resumen" },
    { key: "items", label: "Items" },
    { key: "personas", label: "Personas" },
    { key: "observaciones", label: "Observaciones" },
  ]

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "—")
  const formatWeight = (value?: number) => (typeof value === "number" ? `${value} kg` : "—")

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
    <div className="space-y-5 pb-6">
      <div className="sticky top-0 z-20 rounded-xl border bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">Guía {guia.numeroGuia}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{guia.tipoValija || "ENTRADA"}</Badge>
                {guia.isExtraordinaria && <Badge className="bg-amber-100 text-amber-800">Extraordinaria</Badge>}
                <Badge className={estadoColors[guia.estado]}>{estadoLabels[guia.estado] || guia.estado}</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={() => router.push(`/dashboard/guias-valija/${guia.id}/edit`)}>
                  Editar Guía
                </Button>
                <Button onClick={() => { setActiveTab("items"); setIsEditing(true) }}>
                  <Package className="mr-2 h-4 w-4" />
                  Editar Items
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-[var(--kt-danger)] hover:bg-[var(--kt-danger-light)] hover:text-[var(--kt-danger)]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={cancelEditing} disabled={saving}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button onClick={saveItems} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Emisión</p><p className="font-semibold">{formatDate(guia.fechaEmision)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Envío</p><p className="font-semibold">{formatDate(guia.fechaEnvio)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Recibo</p><p className="font-semibold">{formatDate(guia.fechaRecibo)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Peso Valija</p><p className="font-semibold">{formatWeight(guia.pesoValija)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Peso Oficial</p><p className="font-semibold">{formatWeight(guia.pesoOficial)}</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={activeTab === tab.key ? "default" : "outline"}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="rounded border border-[var(--kt-danger)] bg-[var(--kt-danger-light)] px-4 py-3 text-[var(--kt-danger)]">
          {error}
        </div>
      )}

      {activeTab === "resumen" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Resumen de la guía
              </CardTitle>
              <CardDescription>Datos principales para lectura rápida.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Número de guía</p><p className="font-medium">{guia.numeroGuia || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Total de items</p><p className="font-medium">{guia.items.length || 0}</p></div>
              <div><p className="text-xs text-muted-foreground">Número de paquetes</p><p className="font-medium">{guia.numeroPaquetes ?? "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Tipo</p><p className="font-medium">{guia.tipoValija || "ENTRADA"}{guia.isExtraordinaria ? " - EXTRAORDINARIA" : ""}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Estado</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Badge className={estadoColors[guia.estado]}>{estadoLabels[guia.estado] || guia.estado}</Badge>
              <p className="text-sm text-muted-foreground">Creado: {formatDate(guia.createdAt)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "items" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Items de la Guía ({guia.items.length})
            </CardTitle>
            <CardDescription>Lista completa de items contenidos en la guía.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-auto pr-1">
            <GuiaValijaItems
              title="Items de la Guía"
              items={items}
              onChange={setItems}
              validateRef={validateRef}
              editable={isEditing}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === "personas" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Remitente</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{guia.remitenteNombre || "—"}</p>
              <p className="text-sm text-muted-foreground">{guia.remitenteCargo || "—"}</p>
              <p className="text-sm text-muted-foreground">{guia.remitenteEmail || "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Destinatario</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{guia.destinatarioNombre || "—"}</p>
              <p className="text-sm text-muted-foreground">{guia.destinatarioCargo || "—"}</p>
              <p className="text-sm text-muted-foreground">{guia.destinatarioEmail || "—"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "observaciones" && (
        <Card>
          <CardHeader><CardTitle>Información Adicional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium">Descripción del Contenido</h4>
              <p className="text-sm text-muted-foreground">{guia.descripcionContenido || "—"}</p>
            </div>
            <div>
              <h4 className="mb-2 font-medium">Observaciones</h4>
              <p className="text-sm text-muted-foreground">{guia.observaciones || "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

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
