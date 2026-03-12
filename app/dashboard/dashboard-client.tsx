"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ErrorComponent } from "@/components/ui/error-component"
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  FileSearch,
  FileText,
  FolderOpen,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Stamp,
  Workflow,
} from "lucide-react"

interface DashboardMetrics {
  documents: {
    total: number
    thisMonth: number
    thisWeek: number
    processingSuccess: number
    processingFailed: number
  }
  guiasValija: {
    total: number
    active: number
    byStatus: Record<string, number>
    byType: Record<string, number>
  }
  hojasRemision: {
    total: number
    active: number
    byStatus: Record<string, number>
    byType: Record<string, number>
  }
}

interface DashboardClientProps {
  userId: string
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_transito: "En transito",
  entregado: "Entregado",
  cancelado: "Cancelado",
  borrador: "Borrador",
  enviada: "Enviada",
  recibida: "Recibida",
  anulada: "Anulada",
}

function formatStatusLabel(value: string) {
  return STATUS_LABELS[value] || value.replace(/_/g, " ")
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--kt-primary)]">{eyebrow}</p>
      <div>
        <h1 className="text-3xl font-semibold leading-tight text-[var(--kt-text-dark)]">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--kt-text-muted)]">{description}</p>
      </div>
    </div>
  )
}

function HeroPanel({ metrics }: { metrics: DashboardMetrics }) {
  const derived = useMemo(() => {
    const pendingGuides = (metrics.guiasValija.byStatus.pendiente || 0) + (metrics.guiasValija.byStatus.en_transito || 0)
    const openRemissions = (metrics.hojasRemision.byStatus.borrador || 0) + (metrics.hojasRemision.byStatus.enviada || 0)
    const totalReviewed = metrics.documents.processingSuccess + metrics.documents.processingFailed
    const qualityRate = totalReviewed > 0 ? Math.round((metrics.documents.processingSuccess / totalReviewed) * 100) : 0

    return {
      pendingGuides,
      openRemissions,
      qualityRate,
      alerts: metrics.documents.processingFailed + pendingGuides,
    }
  }, [metrics])

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <Card className="overflow-hidden border-[var(--kt-primary)]/15 bg-[radial-gradient(circle_at_top_left,rgba(54,153,255,0.18),transparent_36%),linear-gradient(135deg,#ffffff_0%,#f6faff_55%,#eef5ff_100%)] shadow-[0_24px_60px_-32px_rgba(54,153,255,0.45)]">
        <CardContent className="p-6 md:p-7">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <SectionHeader
                eyebrow="Centro De Operaciones"
                title="El panel debe decirte que revisar ahora, no solo cuantos registros existen."
                description="Priorizamos cola de trabajo, salud del procesamiento y accesos directos al flujo documental diario."
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Pendientes</p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--kt-text-dark)]">{derived.pendingGuides}</p>
                  <p className="mt-1 text-xs text-[var(--kt-text-muted)]">guias activas por resolver</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Remisiones</p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--kt-text-dark)]">{derived.openRemissions}</p>
                  <p className="mt-1 text-xs text-[var(--kt-text-muted)]">abiertas o en borrador</p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Calidad OCR</p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--kt-text-dark)]">{derived.qualityRate}%</p>
                  <p className="mt-1 text-xs text-[var(--kt-text-muted)]">procesamiento exitoso</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[28px] border border-[var(--kt-primary)]/20 bg-[#0f172fcc] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2 text-sm font-medium text-white/70">
                <Workflow className="h-4 w-4" />
                Flujo del dia
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">Documentos esta semana</p>
                      <p className="mt-2 text-4xl font-semibold">{metrics.documents.thisWeek}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/75">
                      {derived.alerts} focos de atencion
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                      <span>Procesados correctamente</span>
                      <span>{metrics.documents.processingSuccess}</span>
                    </div>
                    <Progress value={derived.qualityRate} className="h-2 bg-white/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white/8 p-3">
                      <p className="text-white/60">Fallidos</p>
                      <p className="mt-1 text-xl font-semibold">{metrics.documents.processingFailed}</p>
                    </div>
                    <div className="rounded-2xl bg-white/8 p-3">
                      <p className="text-white/60">Este mes</p>
                      <p className="mt-1 text-xl font-semibold">{metrics.documents.thisMonth}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Button asChild size="sm" className="bg-white text-slate-900 hover:bg-white/90">
                  <Link href="/dashboard/documents">
                    Revisar documentos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
                  <Link href="/dashboard/guias-valija">Ir a guias</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--kt-gray-200)] bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-[var(--kt-primary)]" />
            Acciones rapidas
          </CardTitle>
          <CardDescription>Entradas directas a las pantallas que mueven la operacion.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {[
            { href: "/dashboard/guias-valija", label: "Guías de valija", description: "Subir, confirmar y editar guias", icon: FolderOpen },
            { href: "/dashboard/guias-valija-items", label: "Items de valija", description: "Validar items y derivados", icon: ClipboardList },
            { href: "/dashboard/hojas-remision", label: "Hojas de remision", description: "Crear HR nuevas o editar las existentes", icon: FileText },
            { href: "/dashboard/oficios", label: "Oficios", description: "Controlar oficios detectados", icon: ScrollText },
            { href: "/dashboard/documents?rStatus=pending", label: "Revisión pendiente", description: "Atacar la cola documental", icon: FileSearch },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-2xl border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-[var(--kt-primary)]/35 hover:bg-white hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[var(--kt-gray-200)]">
                  <action.icon className="h-5 w-5 text-[var(--kt-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--kt-text-dark)]">{action.label}</p>
                  <p className="text-sm text-[var(--kt-text-muted)]">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--kt-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--kt-primary)]" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function WorkQueues({ metrics }: { metrics: DashboardMetrics }) {
  const pendingGuides = (metrics.guiasValija.byStatus.pendiente || 0) + (metrics.guiasValija.byStatus.en_transito || 0)
  const pendingDocuments = metrics.documents.processingFailed
  const openRemissions = (metrics.hojasRemision.byStatus.borrador || 0) + (metrics.hojasRemision.byStatus.enviada || 0)

  const queues = [
    {
      title: "Guías activas",
      value: pendingGuides,
      href: "/dashboard/guias-valija",
      accent: "border-l-[var(--kt-warning)]",
      icon: FolderOpen,
      note: "Pendientes o en transito",
    },
    {
      title: "Revisión documental",
      value: pendingDocuments,
      href: "/dashboard/documents?rStatus=pending",
      accent: "border-l-[var(--kt-danger)]",
      icon: AlertTriangle,
      note: "Procesamientos fallidos",
    },
    {
      title: "Hojas abiertas",
      value: openRemissions,
      href: "/dashboard/hojas-remision",
      accent: "border-l-[var(--kt-info)]",
      icon: FileText,
      note: "Borrador o enviadas",
    },
    {
      title: "Control de oficios",
      value: metrics.documents.thisWeek,
      href: "/dashboard/oficios",
      accent: "border-l-[var(--kt-primary)]",
      icon: Stamp,
      note: "Revisa los detectados esta semana",
    },
  ]

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--kt-primary)]">Trabajo Pendiente</p>
          <h2 className="text-xl font-semibold text-[var(--kt-text-dark)]">Colas que requieren intervención</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {queues.map((queue) => (
          <Link key={queue.title} href={queue.href}>
            <Card className={`h-full border-[var(--kt-gray-200)] border-l-4 ${queue.accent} transition-all hover:-translate-y-0.5 hover:shadow-md`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--kt-text-dark)]">{queue.title}</p>
                    <p className="mt-3 text-4xl font-semibold text-[var(--kt-text-dark)]">{queue.value}</p>
                    <p className="mt-2 text-xs text-[var(--kt-text-muted)]">{queue.note}</p>
                  </div>
                  <div className="rounded-2xl bg-[var(--kt-gray-50)] p-3">
                    <queue.icon className="h-5 w-5 text-[var(--kt-primary)]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}

function PipelineOverview({ metrics }: { metrics: DashboardMetrics }) {
  const totalProcessed = metrics.documents.processingSuccess + metrics.documents.processingFailed
  const successRate = totalProcessed > 0 ? Math.round((metrics.documents.processingSuccess / totalProcessed) * 100) : 0

  const guideStatuses = Object.entries(metrics.guiasValija.byStatus)
  const remisionStatuses = Object.entries(metrics.hojasRemision.byStatus)

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.8fr)]">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Flujo de guías</CardTitle>
          <CardDescription>Distribución actual de las guías de valija.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {guideStatuses.length > 0 ? (
            guideStatuses.map(([status, count]) => {
              const ratio = metrics.guiasValija.total > 0 ? (count / metrics.guiasValija.total) * 100 : 0
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--kt-text-dark)]">{formatStatusLabel(status)}</span>
                    <span className="text-[var(--kt-text-muted)]">{count}</span>
                  </div>
                  <Progress value={ratio} className="h-2" />
                </div>
              )
            })
          ) : (
            <p className="text-sm text-[var(--kt-text-muted)]">No hay guías registradas.</p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Flujo de remisiones</CardTitle>
          <CardDescription>Estado operativo de las hojas de remisión.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {remisionStatuses.length > 0 ? (
            remisionStatuses.map(([status, count]) => {
              const ratio = metrics.hojasRemision.total > 0 ? (count / metrics.hojasRemision.total) * 100 : 0
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--kt-text-dark)]">{formatStatusLabel(status)}</span>
                    <span className="text-[var(--kt-text-muted)]">{count}</span>
                  </div>
                  <Progress value={ratio} className="h-2" />
                </div>
              )
            })
          ) : (
            <p className="text-sm text-[var(--kt-text-muted)]">No hay hojas de remisión registradas.</p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-[var(--kt-gray-200)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--kt-success)]" />
            Salud del sistema
          </CardTitle>
          <CardDescription>Indicadores rápidos del pipeline documental.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-[var(--kt-gray-200)] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Tasa de éxito</p>
            <p className="mt-2 text-4xl font-semibold text-[var(--kt-success)]">{successRate}%</p>
            <p className="mt-1 text-xs text-[var(--kt-text-muted)]">
              {metrics.documents.processingSuccess} correctos · {metrics.documents.processingFailed} fallidos
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[var(--kt-primary-light)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--kt-text-muted)]">Documentos</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--kt-primary)]">{metrics.documents.total}</p>
            </div>
            <div className="rounded-2xl bg-[var(--kt-warning-light)] p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--kt-text-muted)]">Este mes</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--kt-warning)]">{metrics.documents.thisMonth}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DerivedInsights({ metrics }: { metrics: DashboardMetrics }) {
  const entradaCount = metrics.guiasValija.byType.ENTRADA || 0
  const extraordinarySignals = metrics.guiasValija.byType.EXTRAORDINARIA || 0
  const remisionLoad = metrics.hojasRemision.total > 0 ? Math.round((metrics.hojasRemision.active / metrics.hojasRemision.total) * 100) : 0

  const insights = [
    {
      title: "Predominio de ingreso",
      value: entradaCount,
      description: "Guías de entrada registradas hasta ahora.",
    },
    {
      title: "Señal extraordinaria",
      value: extraordinarySignals,
      description: "Guías extraordinarias detectadas en el sistema.",
    },
    {
      title: "Carga de remisiones",
      value: `${remisionLoad}%`,
      description: "Porcentaje de remisiones todavía activas.",
    },
  ]

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--kt-primary)]">Lectura Ejecutiva</p>
        <h2 className="text-xl font-semibold text-[var(--kt-text-dark)]">Tres señales para revisar antes de seguir operando</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {insights.map((insight) => (
          <Card key={insight.title} className="shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-[var(--kt-text-dark)]">{insight.title}</p>
              <p className="mt-3 text-4xl font-semibold text-[var(--kt-text-dark)]">{insight.value}</p>
              <p className="mt-2 text-sm text-[var(--kt-text-muted)]">{insight.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    let mounted = true

    async function fetchMetrics() {
      try {
        const response = await fetch(`/api/dashboard?userId=${userId}`, {
          cache: "no-store",
          signal: abortController.signal,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        if (!response.ok) {
          throw new Error("No se pudieron cargar las metricas")
        }

        const data = await response.json()
        if (mounted) setMetrics(data)
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError" && mounted) {
          setError(err.message)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void fetchMetrics()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [userId])

  if (loading) {
    return <div className="space-y-6"><div className="h-8 w-64 animate-pulse rounded bg-gray-200" /></div>
  }

  if (error || !metrics) {
    return <ErrorComponent error={new Error(error || "Error al cargar datos")} resetErrorBoundary={() => window.location.reload()} />
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorComponent}>
      <div className="space-y-8">
        <HeroPanel metrics={metrics} />
        <WorkQueues metrics={metrics} />
        <PipelineOverview metrics={metrics} />
        <DerivedInsights metrics={metrics} />
      </div>
    </ErrorBoundary>
  )
}
