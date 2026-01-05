"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import { ArrowLeft, FileText, MapPin, User, Calendar, Weight, Trash2, Edit, Send, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

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

function getEstadoConfig(estado: string) {
  const config = {
    borrador: {
      color: "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]",
      icon: <FileText className="h-3 w-3" />,
      label: "Borrador"
    },
    enviada: {
      color: "bg-blue-100 text-blue-700",
      icon: <Send className="h-3 w-3" />,
      label: "Enviada"
    },
    recibida: {
      color: "bg-[var(--kt-success-light)] text-[var(--kt-success)]",
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Recibida"
    },
    anulada: {
      color: "bg-[var(--kt-danger-light)] text-[var(--kt-danger)]",
      icon: <XCircle className="h-3 w-3" />,
      label: "Anulada"
    }
  }

  return config[estado.toLowerCase() as keyof typeof config] || config.borrador
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

  const estadoConfig = getEstadoConfig(hoja.estado)

  return (
    <div className="space-y-6">
      {/* Header Compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          {/* Título + Número + Estado - Inline */}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">
                Hoja de Remisión
              </h1>
              <p className="text-sm text-[var(--kt-text-muted)] flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                {hoja.numeroCompleto}
              </p>
            </div>

            <Separator orientation="vertical" className="h-8" />

            {/* Estado Badge - Prominente */}
            <Badge className={`${estadoConfig.color} px-3 py-1 text-sm font-medium`}>
              {estadoConfig.icon}
              <span className="ml-1">{estadoConfig.label}</span>
            </Badge>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteConfirm(true)}
            className="text-[var(--kt-danger)] hover:bg-[var(--kt-danger-light)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info Summary - 4 KPIs con gradientes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* KPI 1: Tipo Documento */}
        <Card className="bg-gradient-to-br from-[var(--kt-primary-light)] to-white border-l-4 border-l-[var(--kt-primary)] transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <FileText className="h-5 w-5 text-[var(--kt-primary)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--kt-text-muted)] font-medium uppercase tracking-wide">
                  Tipo
                </p>
                <p className="text-sm font-semibold text-[var(--kt-text-dark)]">
                  Hoja Remisión
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Fecha */}
        <Card className="bg-gradient-to-br from-[var(--kt-info-light)] to-white border-l-4 border-l-[var(--kt-info)] transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Calendar className="h-5 w-5 text-[var(--kt-info)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--kt-text-muted)] font-medium uppercase tracking-wide">
                  Fecha
                </p>
                <p className="text-sm font-semibold text-[var(--kt-text-dark)]">
                  {new Date(hoja.fecha).toLocaleDateString('es-PE', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Peso */}
        <Card className="bg-gradient-to-br from-[var(--kt-success-light)] to-white border-l-4 border-l-[var(--kt-success)] transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Weight className="h-5 w-5 text-[var(--kt-success)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--kt-text-muted)] font-medium uppercase tracking-wide">
                  Peso
                </p>
                <p className="text-sm font-semibold text-[var(--kt-text-dark)]">
                  {hoja.peso ? `${hoja.peso} kg` : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Sigla Unidad */}
        <Card className="bg-gradient-to-br from-[var(--kt-warning-light)] to-white border-l-4 border-l-[var(--kt-warning)] transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <MapPin className="h-5 w-5 text-[var(--kt-warning)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--kt-text-muted)] font-medium uppercase tracking-wide">
                  Unidad
                </p>
                <p className="text-sm font-semibold text-[var(--kt-text-dark)]">
                  {hoja.siglaUnidad}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card Principal Unificado */}
      <Card className="shadow-sm transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-[var(--kt-primary)]" />
            Información de la Hoja de Remisión
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* SECCIÓN: PARTES INVOLUCRADAS */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--kt-text-dark)] uppercase tracking-wide flex items-center gap-2">
              <User className="h-4 w-4" />
              Partes Involucradas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Para (Destinatario) */}
              <div className="flex items-start gap-3 p-4 bg-[var(--kt-gray-50)] rounded-lg border border-[var(--kt-gray-200)]">
                <div className="p-2 bg-[var(--kt-primary-light)] rounded-full flex-shrink-0">
                  <User className="h-5 w-5 text-[var(--kt-primary)]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[var(--kt-text-muted)] uppercase mb-1">
                    Para (Destinatario)
                  </p>
                  <p className="text-sm font-medium text-[var(--kt-text-dark)] whitespace-pre-wrap leading-relaxed">
                    {hoja.para}
                  </p>
                </div>
              </div>

              {/* Remitente */}
              <div className="flex items-start gap-3 p-4 bg-[var(--kt-gray-50)] rounded-lg border border-[var(--kt-gray-200)]">
                <div className="p-2 bg-[var(--kt-info-light)] rounded-full flex-shrink-0">
                  <User className="h-5 w-5 text-[var(--kt-info)]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[var(--kt-text-muted)] uppercase mb-1">
                    Remitente
                  </p>
                  <p className="text-sm font-medium text-[var(--kt-text-dark)] whitespace-pre-wrap leading-relaxed">
                    {hoja.remitente}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* SECCIÓN: CONTENIDO DEL DOCUMENTO */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--kt-text-dark)] uppercase tracking-wide flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contenido del Documento
            </h3>

            {/* Referencia (opcional) */}
            {hoja.referencia && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--kt-text-muted)] uppercase">
                  Referencia
                </label>
                <p className="text-sm text-[var(--kt-text-dark)] bg-[var(--kt-gray-50)] px-3 py-2 rounded border border-[var(--kt-gray-200)]">
                  {hoja.referencia}
                </p>
              </div>
            )}

            {/* Documento - PRINCIPAL */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--kt-text-muted)] uppercase flex items-center gap-2">
                <Badge variant="outline" className="text-xs px-2 py-0">
                  Principal
                </Badge>
                Documento
              </label>
              <div className="bg-gradient-to-br from-[var(--kt-primary-light)] to-white p-4 rounded-lg border-2 border-[var(--kt-primary)] shadow-sm">
                <p className="text-base font-semibold text-[var(--kt-text-dark)] whitespace-pre-wrap leading-relaxed">
                  {hoja.documento}
                </p>
              </div>
            </div>

            {/* Asunto */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--kt-text-muted)] uppercase">
                Asunto
              </label>
              <p className="text-sm text-[var(--kt-text-dark)] whitespace-pre-wrap leading-relaxed">
                {hoja.asunto}
              </p>
            </div>

            {/* Destino */}
            <div className="flex items-start gap-2 p-3 bg-[var(--kt-warning-light)] rounded-lg border border-[var(--kt-warning)]">
              <MapPin className="h-4 w-4 text-[var(--kt-warning)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <label className="text-xs font-medium text-[var(--kt-text-muted)] uppercase block mb-1">
                  Destino Final
                </label>
                <p className="text-sm font-semibold text-[var(--kt-text-dark)]">
                  {hoja.destino}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer con información de actualización */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-[var(--kt-text-muted)]">
              <Calendar className="h-4 w-4" />
              <span>
                Última actualización: {new Date(hoja.updatedAt).toLocaleDateString('es-PE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/hojas-remision")}>
                Volver al listado
              </Button>
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
