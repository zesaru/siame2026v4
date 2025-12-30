"use client"

import { useEffect, useState } from "react"
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
import { ArrowLeft, FileText, MapPin, User, Calendar, Weight, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Icon from "@/components/ui/Icon"

interface HojaRemisionDetails {
  id: string
  numero: number
  numeroCompleto: string
  siglaUnidad: string
  fecha: string
  para: string
  remitente: string
  referencia?: string
  documento: string
  asunto: string
  destino: string
  peso?: number
  estado: string
  createdAt: string
  updatedAt: string
}

export default function HojaRemisionViewPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [hoja, setHoja] = useState<HojaRemisionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/auth/signin")
      return
    }
    fetchHojaDetails()
  }, [session, status, params.id])

  async function fetchHojaDetails() {
    try {
      const response = await fetch(`/api/hojas-remision/${params.id}`)
      if (!response.ok) throw new Error("Error al cargar los detalles de la hoja de remisión")
      const data = await response.json()
      setHoja(data)
    } catch (error) {
      toast.error("Error al cargar los detalles de la hoja de remisión")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/hojas-remision/${params.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Error al eliminar la hoja de remisión")

      toast.success("Hoja de Remisión eliminada correctamente")
      setDeleteConfirm(false)
      router.push("/dashboard/hojas-remision")
    } catch (error) {
      toast.error("Error al eliminar la hoja de remisión")
    }
  }

  function getEstadoColor(estado: string) {
    switch (estado.toLowerCase()) {
      case "borrador":
        return "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]"
      case "enviada":
        return "bg-blue-100 text-blue-700"
      case "recibida":
        return "bg-[var(--kt-success-light)] text-[var(--kt-success)]"
      case "anulada":
        return "bg-[var(--kt-danger-light)] text-[var(--kt-danger)]"
      default:
        return "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]"
    }
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

  if (!hoja) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-[var(--kt-text-dark)] mb-2">Hoja de Remisión no encontrada</h2>
        <p className="text-[var(--kt-text-muted)] mb-4">No se pudo cargar la hoja de remisión solicitada</p>
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
              Detalles de Hoja de Remisión
            </h1>
            <p className="text-[var(--kt-text-muted)]">
              Número: {hoja.numeroCompleto}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/hojas-remision")}
          >
            Volver al listado
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteConfirm(true)}
            className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)] hover:bg-[var(--kt-danger-light)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[var(--kt-primary)]" />
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Número</p>
                <p className="text-sm font-medium">{hoja.numeroCompleto}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[var(--kt-info)]" />
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Fecha</p>
                <p className="text-sm font-medium">
                  {new Date(hoja.fecha).toLocaleDateString('es-PE')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Weight className="h-5 w-5 text-[var(--kt-warning)]" />
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Estado</p>
                <Badge className={getEstadoColor(hoja.estado)}>
                  {hoja.estado}
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
                <p className="text-xs text-[var(--kt-text-muted)]">Peso</p>
                <p className="text-sm font-medium">
                  {hoja.peso ? `${hoja.peso} kg` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Identificación */}
      <Card>
        <CardHeader>
          <CardTitle>Identificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-[var(--kt-text-dark)] mb-3">Número Completo</h3>
              <p className="text-sm text-[var(--kt-text-muted)]">{hoja.numeroCompleto}</p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--kt-text-dark)] mb-3">Sigla Unidad</h3>
              <p className="text-sm text-[var(--kt-text-muted)]">{hoja.siglaUnidad}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Para (Destinatario)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--kt-text-muted)] whitespace-pre-wrap">{hoja.para}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Remitente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--kt-text-muted)] whitespace-pre-wrap">{hoja.remitente}</p>
          </CardContent>
        </Card>
      </div>

      {/* Contenido */}
      <Card>
        <CardHeader>
          <CardTitle>Contenido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hoja.referencia && (
            <div>
              <h4 className="font-medium text-[var(--kt-text-dark)] mb-2">Referencia</h4>
              <p className="text-sm text-[var(--kt-text-muted)] whitespace-pre-wrap">{hoja.referencia}</p>
            </div>
          )}
          <div>
            <h4 className="font-medium text-[var(--kt-text-dark)] mb-2">Documento</h4>
            <p className="text-sm text-[var(--kt-text-muted)] whitespace-pre-wrap">{hoja.documento}</p>
          </div>
          <div>
            <h4 className="font-medium text-[var(--kt-text-dark)] mb-2">Asunto</h4>
            <p className="text-sm text-[var(--kt-text-muted)] whitespace-pre-wrap">{hoja.asunto}</p>
          </div>
          <div>
            <h4 className="font-medium text-[var(--kt-text-dark)] mb-2">Destino</h4>
            <p className="text-sm text-[var(--kt-text-muted)] whitespace-pre-wrap">{hoja.destino}</p>
          </div>
        </CardContent>
      </Card>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Auditoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-[var(--kt-text-muted)]">Creado:</span>
              <span className="ml-2 text-sm">
                {new Date(hoja.createdAt).toLocaleString('es-PE')}
              </span>
            </div>
            <div>
              <span className="text-sm text-[var(--kt-text-muted)]">Actualizado:</span>
              <span className="ml-2 text-sm">
                {new Date(hoja.updatedAt).toLocaleString('es-PE')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Hoja de Remisión</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la hoja de remisión <strong>{hoja.numeroCompleto}</strong>?
              Esta acción no se puede deshacer.
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
