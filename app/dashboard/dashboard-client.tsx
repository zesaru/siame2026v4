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
  FileText,
  FolderOpen,
  ShieldCheck,
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
  role: "SUPER_ADMIN" | "ADMIN" | "USER"
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_transito: "En tránsito",
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

function HeroPanel({ metrics, role }: { metrics: DashboardMetrics; role: DashboardClientProps["role"] }) {
  const canViewGlobalMetrics = role === "ADMIN" || role === "SUPER_ADMIN"

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
      documentsPending: metrics.documents.processingFailed,
    }
  }, [metrics])

  return (
    <Card className="overflow-hidden border-[var(--kt-primary)]/15 bg-[radial-gradient(circle_at_top_left,rgba(54,153,255,0.18),transparent_36%),linear-gradient(135deg,#ffffff_0%,#f6faff_55%,#eef5ff_100%)] shadow-[0_24px_60px_-32px_rgba(54,153,255,0.45)]">
      <CardContent className="p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="space-y-5">
            <SectionHeader
              eyebrow="Centro documentario"
              title="Tablero operativo con cifras reales del sistema."
              description={
                canViewGlobalMetrics
                  ? "Los contadores muestran documentos, guías y hojas de remisión registradas en todo el sistema."
                  : "Los contadores muestran tu actividad reciente en documentos, guías y hojas de remisión."
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Documentos</p>
                <p className="mt-3 text-3xl font-semibold text-[var(--kt-text-dark)]">{metrics.documents.total}</p>
                <p className="mt-1 text-xs text-[var(--kt-text-muted)]">registrados en total</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Guías de valija</p>
                <p className="mt-3 text-3xl font-semibold text-[var(--kt-text-dark)]">{metrics.guiasValija.total}</p>
                <p className="mt-1 text-xs text-[var(--kt-text-muted)]">guías registradas</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Hojas de remisión</p>
                <p className="mt-3 text-3xl font-semibold text-[var(--kt-text-dark)]">{metrics.hojasRemision.total}</p>
                <p className="mt-1 text-xs text-[var(--kt-text-muted)]">HR registradas</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border border-[#d8e7ff] bg-white/92 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Esta semana</p>
              <p className="mt-2 text-4xl font-semibold text-[var(--kt-text-dark)]">{metrics.documents.thisWeek}</p>
              <p className="mt-2 text-sm text-[var(--kt-text-muted)]">documentos ingresados</p>
            </div>
            <div className="rounded-[28px] border border-[#d8e7ff] bg-white/92 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Este mes</p>
              <p className="mt-2 text-4xl font-semibold text-[var(--kt-text-dark)]">{metrics.documents.thisMonth}</p>
              <p className="mt-2 text-sm text-[var(--kt-text-muted)]">documentos ingresados</p>
            </div>
            <div className="rounded-[28px] border border-[#d8e7ff] bg-white/92 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Guías activas</p>
              <p className="mt-2 text-4xl font-semibold text-[var(--kt-text-dark)]">{derived.pendingGuides}</p>
              <p className="mt-2 text-sm text-[var(--kt-text-muted)]">pendientes o en tránsito</p>
            </div>
            <div className="rounded-[28px] border border-[#d8e7ff] bg-white/92 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Documentos fallidos</p>
              <p className="mt-2 text-4xl font-semibold text-[var(--kt-text-dark)]">{derived.documentsPending}</p>
              <p className="mt-2 text-sm text-[var(--kt-text-muted)]">requieren revisión</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[var(--kt-primary)]/15 bg-white/70 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm text-[var(--kt-text-muted)]">
            <Workflow className="h-4 w-4 text-[var(--kt-primary)]" />
            {derived.alerts} focos de atención entre documentos fallidos y guías activas.
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" className="bg-[var(--kt-primary)] text-white hover:bg-[var(--kt-primary)]/90">
              <Link href="/dashboard/documents">
                Revisar documentos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/guias-valija">Ver guías</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function WorkQueues({ metrics, role }: { metrics: DashboardMetrics; role: DashboardClientProps["role"] }) {
  const canViewGlobalMetrics = role === "ADMIN" || role === "SUPER_ADMIN"
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
      note: "Pendientes o en tránsito",
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
          <h2 className="text-xl font-semibold text-[var(--kt-text-dark)]">
            {canViewGlobalMetrics ? "Colas globales que requieren intervención" : "Tu trabajo pendiente requiere intervención"}
          </h2>
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

function PipelineOverview({ metrics, role }: { metrics: DashboardMetrics; role: DashboardClientProps["role"] }) {
  const canViewGlobalMetrics = role === "ADMIN" || role === "SUPER_ADMIN"
  const totalProcessed = metrics.documents.processingSuccess + metrics.documents.processingFailed
  const successRate = totalProcessed > 0 ? Math.round((metrics.documents.processingSuccess / totalProcessed) * 100) : 0

  const guideStatuses = Object.entries(metrics.guiasValija.byStatus)
  const remisionStatuses = Object.entries(metrics.hojasRemision.byStatus)

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(320px,0.8fr)]">
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Flujo de guías</CardTitle>
          <CardDescription>
            {canViewGlobalMetrics
              ? "Distribución actual de las guías de valija en todo el sistema."
              : "Distribución actual de tus guías de valija."}
          </CardDescription>
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
          <CardDescription>
            {canViewGlobalMetrics
              ? "Estado operativo de las hojas de remisión en todo el sistema."
              : "Estado operativo de tus hojas de remisión."}
          </CardDescription>
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
          <CardDescription>
            {canViewGlobalMetrics
              ? "Indicadores rápidos del pipeline documental global."
              : "Indicadores rápidos de tu pipeline documental."}
          </CardDescription>
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

function DerivedInsights({ metrics, role }: { metrics: DashboardMetrics; role: DashboardClientProps["role"] }) {
  const canViewGlobalMetrics = role === "ADMIN" || role === "SUPER_ADMIN"
  const entradaCount = metrics.guiasValija.byType.ENTRADA || 0
  const extraordinarySignals = metrics.guiasValija.byType.EXTRAORDINARIA || 0
  const remisionLoad = metrics.hojasRemision.total > 0 ? Math.round((metrics.hojasRemision.active / metrics.hojasRemision.total) * 100) : 0

  const insights = [
    {
      title: "Predominio de ingreso",
      value: entradaCount,
      description: canViewGlobalMetrics
        ? "Guías de entrada registradas hasta ahora en todo el sistema."
        : "Guías de entrada registradas hasta ahora en tu cuenta.",
    },
    {
      title: "Señal extraordinaria",
      value: extraordinarySignals,
      description: canViewGlobalMetrics
        ? "Guías extraordinarias detectadas en el sistema."
        : "Guías extraordinarias detectadas en tu cuenta.",
    },
    {
      title: "Carga de remisiones",
      value: `${remisionLoad}%`,
      description: canViewGlobalMetrics
        ? "Porcentaje de remisiones todavía activas en todo el sistema."
        : "Porcentaje de remisiones todavía activas en tu cuenta.",
    },
  ]

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--kt-primary)]">Lectura Ejecutiva</p>
        <h2 className="text-xl font-semibold text-[var(--kt-text-dark)]">
          {canViewGlobalMetrics
            ? "Tres señales globales para revisar antes de seguir operando"
            : "Tres señales de tu actividad antes de seguir operando"}
        </h2>
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

export default function DashboardClient({ role }: DashboardClientProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()
    let mounted = true

    async function fetchMetrics() {
      try {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
          signal: abortController.signal,
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        })

        if (!response.ok) {
          throw new Error("No se pudieron cargar las métricas")
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
  }, [])

  if (loading) {
    return <div className="space-y-6"><div className="h-8 w-64 animate-pulse rounded bg-gray-200" /></div>
  }

  if (error || !metrics) {
    return <ErrorComponent error={new Error(error || "Error al cargar datos")} resetErrorBoundary={() => window.location.reload()} />
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorComponent}>
      <div className="space-y-8">
        <HeroPanel metrics={metrics} role={role} />
        <WorkQueues metrics={metrics} role={role} />
        <PipelineOverview metrics={metrics} role={role} />
        <DerivedInsights metrics={metrics} role={role} />
      </div>
    </ErrorBoundary>
  )
}
