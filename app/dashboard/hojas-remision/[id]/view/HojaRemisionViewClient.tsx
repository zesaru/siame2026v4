"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import PDFViewer from "@/components/dashboard/PDFViewer"
import { withTrackView } from "@/lib/utils"
import { HOJA_REMISION_STATUS, normalizeHojaRemisionEstado } from "@/lib/hoja-remision-status"
import { toast } from "sonner"
import {
  ArrowLeft,
  Calendar,
  Download,
  Edit,
  FileText,
  MapPin,
  Send,
  Trash2,
  User,
  Weight,
  XCircle,
  CheckCircle,
} from "lucide-react"

interface HojaRemisionDetails {
  id: string
  numero: number
  numeroCompleto: string
  siglaUnidad: string
  fecha: string
  para: string
  remitente: string
  referencia?: string | null
  documento: string
  asunto: string
  destino: string
  descripcionEmpaque?: string | null
  peso?: number | null
  estado: string
  filePath?: string | null
  createdAt: string
  updatedAt: string
}

function formatRichTextAsPlainText(value: string) {
  if (!value || !value.includes("<")) return value

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/?ul[^>]*>/gi, "\n")
    .replace(/<\/?ol[^>]*>/gi, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/<[^>]+>/g, "")
    .replace(/(^|\n)\s*(\d+)\s*-\s+/g, "$1$2. ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function getEstadoConfig(estado: string) {
  const key = normalizeHojaRemisionEstado(estado)

  const config = {
    [HOJA_REMISION_STATUS.PENDING_REVIEW]: {
      label: "SIN REVISAR",
      className: "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]",
      icon: <FileText className="h-3.5 w-3.5" />,
    },
    [HOJA_REMISION_STATUS.REVIEWED]: {
      label: "REVISADA",
      className: "bg-[var(--kt-success-light)] text-[var(--kt-success)]",
      icon: <CheckCircle className="h-3.5 w-3.5" />,
    },
  }

  return config[key as keyof typeof config] || config[HOJA_REMISION_STATUS.PENDING_REVIEW]
}

interface HojaRemisionViewClientProps {
  session: any
  hojaId: string
  initialHoja?: HojaRemisionDetails | null
}

export default function HojaRemisionViewClient({
  session,
  hojaId,
  initialHoja = null,
}: HojaRemisionViewClientProps) {
  const router = useRouter()
  const [hoja, setHoja] = useState<HojaRemisionDetails | null>(initialHoja)
  const [loading, setLoading] = useState(!initialHoja)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [editChoiceOpen, setEditChoiceOpen] = useState(false)
  const [showPdf, setShowPdf] = useState(true)
  const [pdfAvailable, setPdfAvailable] = useState<boolean | null>(null)
  const canDelete = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN"

  useEffect(() => {
    if (initialHoja) {
      setPdfAvailable(initialHoja.filePath ? null : false)
      return
    }

    const controller = new AbortController()
    let mounted = true

    async function fetchHojaDetails() {
      try {
        const response = await fetch(withTrackView(`/api/hojas-remision/${hojaId}`, true), {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Error al cargar la hoja de remision.")
        const data = await response.json()

        if (mounted) {
          setHoja(data)
          setPdfAvailable(data.filePath ? null : false)
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          toast.error("Error al cargar la hoja de remision.")
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void fetchHojaDetails()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [hojaId])

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/hojas-remision/${hojaId}`, {
        method: "DELETE",
      })

      if (response.status === 404) {
        toast.info("La hoja de remision ya no estaba disponible.")
        setDeleteConfirm(false)
        router.push("/dashboard/hojas-remision")
        router.refresh()
        return
      }

      if (!response.ok) throw new Error("Error al eliminar")

      toast.success("Hoja de remision eliminada.")
      setDeleteConfirm(false)
      router.push("/dashboard/hojas-remision")
      router.refresh()
    } catch {
      toast.error("No se pudo eliminar la hoja de remision.")
    }
  }

  const estadoConfig = useMemo(
    () => getEstadoConfig(hoja?.estado || HOJA_REMISION_STATUS.PENDING_REVIEW),
    [hoja?.estado]
  )

  if (loading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center">
        <LoadingSpinner message="Cargando hoja de remision..." />
      </div>
    )
  }

  if (!hoja) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-[var(--kt-text-dark)]">Hoja de remision no encontrada</h2>
        <p className="mb-4 text-[var(--kt-text-muted)]">No se pudo cargar la hoja solicitada.</p>
        <Button onClick={() => router.push("/dashboard/hojas-remision")}>Volver al listado</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Panel</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/hojas-remision">Hojas de Remision</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{hoja.numeroCompleto}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="sticky top-3 z-20 rounded-2xl border border-[var(--kt-gray-200)] bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
              <Badge className={`${estadoConfig.className} border-0`}>
                {estadoConfig.icon}
                <span className="ml-1">{estadoConfig.label}</span>
              </Badge>
            </div>

            <div>
              <h1 className="text-3xl font-semibold text-[var(--kt-text-dark)]">Hoja de Remision</h1>
              <p className="text-sm text-[var(--kt-text-muted)]">
                {hoja.numeroCompleto} · {hoja.siglaUnidad} · {new Date(hoja.fecha).toLocaleDateString("es-PE")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hoja.filePath && (
              <Button
                variant="outline"
                disabled={pdfAvailable === false}
                onClick={() => {
                  if (pdfAvailable === false) {
                    toast.error("El PDF asociado no está disponible en almacenamiento.")
                    return
                  }
                  window.open(`/api/hojas-remision/file/${hoja.id}`, "_blank")
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                {pdfAvailable === false ? "PDF no disponible" : "Abrir PDF"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditChoiceOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            {canDelete && (
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(true)}
                className="border-[var(--kt-danger)]/20 text-[var(--kt-danger)] hover:bg-[var(--kt-danger-light)]"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(560px,1fr)_minmax(640px,1.02fr)]">
        <aside className="xl:sticky xl:top-28">
          <Card className="overflow-hidden border-[var(--kt-gray-200)] bg-white shadow-lg">
            <button
              onClick={() => setShowPdf((prev) => !prev)}
              className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--kt-gray-50)]"
            >
              <div className="space-y-1">
                <CardTitle className="text-lg">Documento fuente</CardTitle>
                <CardDescription>
                  {hoja.filePath
                    ? pdfAvailable === false
                      ? "El registro existe, pero el archivo físico ya no está disponible."
                      : "Vista previa del PDF asociado."
                    : "Esta hoja no tiene PDF asociado."}
                </CardDescription>
              </div>
              <Badge variant="outline">
                {hoja.filePath ? (pdfAvailable === false ? "Archivo faltante" : "PDF disponible") : "Sin archivo"}
              </Badge>
            </button>

            {showPdf && (
              <CardContent className="border-t border-[var(--kt-gray-200)]">
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Origen</p>
                    <p className="mt-2 text-sm font-medium text-[var(--kt-text-dark)]">{hoja.remitente}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Destino</p>
                    <p className="mt-2 text-sm font-medium text-[var(--kt-text-dark)]">{hoja.destino}</p>
                  </div>
                </div>

                <div className="h-[72vh] min-h-[480px]">
                  {hoja.filePath ? (
                    <PDFViewer
                      file={null}
                      src={`/api/hojas-remision/file/${hoja.id}`}
                      emptyMessage="Esta hoja no tiene PDF asociado."
                      missingMessage="El PDF asociado ya no está disponible en almacenamiento."
                      onAvailabilityChange={setPdfAvailable}
                    />
                  ) : (
                    <PDFViewer
                      file={null}
                      src={null}
                      emptyMessage="Esta hoja no tiene PDF asociado."
                      onAvailabilityChange={setPdfAvailable}
                    />
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </aside>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Card className="border-l-4 border-l-[var(--kt-primary)] bg-[linear-gradient(180deg,var(--kt-primary-light),white)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white p-2 shadow-sm">
                    <FileText className="h-5 w-5 text-[var(--kt-primary)]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--kt-text-muted)]">Tipo</p>
                    <p className="text-sm font-semibold text-[var(--kt-text-dark)]">Hoja de Remision</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[var(--kt-info)] bg-[linear-gradient(180deg,var(--kt-info-light),white)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white p-2 shadow-sm">
                    <Calendar className="h-5 w-5 text-[var(--kt-info)]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--kt-text-muted)]">Fecha</p>
                    <p className="text-sm font-semibold text-[var(--kt-text-dark)]">
                      {new Date(hoja.fecha).toLocaleDateString("es-PE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[var(--kt-success)] bg-[linear-gradient(180deg,var(--kt-success-light),white)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white p-2 shadow-sm">
                    <Weight className="h-5 w-5 text-[var(--kt-success)]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--kt-text-muted)]">Peso</p>
                    <p className="text-sm font-semibold text-[var(--kt-text-dark)]">
                      {hoja.peso ? `${hoja.peso} kg` : "No registrado"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[var(--kt-warning)] bg-[linear-gradient(180deg,var(--kt-warning-light),white)]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white p-2 shadow-sm">
                    <MapPin className="h-5 w-5 text-[var(--kt-warning)]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-[var(--kt-text-muted)]">Unidad</p>
                    <p className="text-sm font-semibold text-[var(--kt-text-dark)]">{hoja.siglaUnidad}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b border-[var(--kt-gray-200)] bg-[linear-gradient(180deg,var(--kt-gray-50),white)]">
              <CardTitle>Lectura documental</CardTitle>
              <CardDescription>Informacion estructurada de la hoja de remision.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-[var(--kt-primary)]" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Destinatario</p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--kt-text-dark)]">{hoja.para}</p>
                </div>

                <div className="rounded-xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-[var(--kt-info)]" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Remitente</p>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--kt-text-dark)]">{hoja.remitente}</p>
                </div>
              </div>

              {hoja.referencia && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Referencia</p>
                  <div className="rounded-xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] px-4 py-3 text-sm text-[var(--kt-text-dark)]">
                    {hoja.referencia}
                  </div>
                </div>
              )}

              {hoja.descripcionEmpaque && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Descripcion empaque</p>
                  <div className="rounded-xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] px-4 py-3 text-sm text-[var(--kt-text-dark)]">
                    {hoja.descripcionEmpaque}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Documento</p>
                <div className="rounded-2xl border border-[var(--kt-primary)]/20 bg-[linear-gradient(180deg,var(--kt-primary-light),white)] p-5">
                  <p className="whitespace-pre-wrap text-base font-semibold leading-relaxed text-[var(--kt-text-dark)]">
                    {hoja.documento}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Asunto</p>
                <div className="rounded-2xl border border-[var(--kt-gray-200)] bg-white p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--kt-text-dark)]">
                    {formatRichTextAsPlainText(hoja.asunto)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--kt-warning)] bg-[var(--kt-warning-light)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--kt-warning)]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Destino final</p>
                </div>
                <p className="text-sm font-semibold text-[var(--kt-text-dark)]">{hoja.destino}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-[var(--kt-text-muted)]">
                Ultima actualizacion:{" "}
                {new Date(hoja.updatedAt).toLocaleDateString("es-PE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push("/dashboard/hojas-remision")}>
                  Volver al listado
                </Button>
                <Button onClick={() => setEditChoiceOpen(true)}>
                  Editar hoja
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {canDelete && (
        <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar hoja de remision</AlertDialogTitle>
              <AlertDialogDescription>
                Estas a punto de eliminar <strong>{hoja.numeroCompleto}</strong>. Esta accion no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-[var(--kt-danger)] hover:bg-[var(--kt-danger-dark)]">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={editChoiceOpen} onOpenChange={setEditChoiceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Como quieres editar esta hoja?</AlertDialogTitle>
            <AlertDialogDescription>
              Puedes corregir campos manualmente o subir un PDF nuevo para analizarlo antes de guardar
              {hoja ? ` en ${hoja.numeroCompleto}` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                setEditChoiceOpen(false)
                router.push(`/dashboard/hojas-remision/edit/${hojaId}`)
              }}
            >
              Editar campos
            </Button>
            <AlertDialogAction
              onClick={() => {
                setEditChoiceOpen(false)
                router.push(`/dashboard/hojas-remision/edit/${hojaId}?intent=upload`)
              }}
            >
              Subir archivo y analizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
