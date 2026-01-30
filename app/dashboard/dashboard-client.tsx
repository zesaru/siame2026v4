"use client"

import { useState, useEffect } from "react"
import { ErrorBoundary } from "react-error-boundary"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import StatCard from "@/components/cards/StatCard"
import { ErrorComponent } from "@/components/ui/error-component"

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

function MetricsGrid({ metrics }: { metrics: DashboardMetrics }) {
  // Calculate success rate
  const totalProcessed = metrics.documents.processingSuccess + metrics.documents.processingFailed
  const successRate = totalProcessed > 0
    ? Math.round((metrics.documents.processingSuccess / totalProcessed) * 100)
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Documentos Analizados"
        value={metrics.documents.total}
        description={`${metrics.documents.thisMonth} este mes`}
        icon="document"
        color="primary"
      />

      <StatCard
        title="Guías Activas"
        value={metrics.guiasValija.active}
        description={`de ${metrics.guiasValija.total} totales`}
        icon="suitcase"
        color="warning"
      />

      <StatCard
        title="Remisiones Activas"
        value={metrics.hojasRemision.active}
        description={`de ${metrics.hojasRemision.total} totales`}
        icon="shipping"
        color="info"
      />

      <StatCard
        title="Tasa de Éxito"
        value={`${successRate}%`}
        description={`${metrics.documents.processingFailed} fallidos`}
        icon="check"
        color="success"
      />
    </div>
  )
}

function StatusBreakdown({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Guías de Valija Status */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Guías de Valija por Estado</CardTitle>
          <CardDescription className="text-sm text-[var(--kt-text-muted)]">
            Distribución actual de todas las guías registradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(metrics.guiasValija.byStatus).length > 0 ? (
            Object.entries(metrics.guiasValija.byStatus).map(([status, count]) => (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-medium capitalize"
                    aria-label={`${status.replace(/_/g, " ")}: ${count} guías`}
                  >
                    {status.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-semibold text-[var(--kt-text-dark)]">
                    {count}
                  </span>
                </div>
                <Progress
                  value={(count / metrics.guiasValija.total) * 100}
                  className="h-2"
                  aria-label={`Porcentaje de guías ${status}: ${Math.round((count / metrics.guiasValija.total) * 100)}%`}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--kt-text-muted)]">
              No hay guías registradas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Hojas de Remisión Status */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Hojas de Remisión por Estado</CardTitle>
          <CardDescription className="text-sm text-[var(--kt-text-muted)]">
            Distribución actual de todas las hojas de remisión registradas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(metrics.hojasRemision.byStatus).length > 0 ? (
            Object.entries(metrics.hojasRemision.byStatus).map(([status, count]) => (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-medium capitalize"
                    aria-label={`${status.replace(/_/g, " ")}: ${count} remisiones`}
                  >
                    {status.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm font-semibold text-[var(--kt-text-dark)]">
                    {count}
                  </span>
                </div>
                <Progress
                  value={(count / metrics.hojasRemision.total) * 100}
                  className="h-2"
                  aria-label={`Porcentaje de remisiones ${status}: ${Math.round((count / metrics.hojasRemision.total) * 100)}%`}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--kt-text-muted)]">
              No hay hojas de remisión registradas
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function QuickStats({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Documentos esta Semana</CardTitle>
          <CardDescription className="text-sm text-[var(--kt-text-muted)]">
            Documentos procesados en los últimos 7 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-[var(--kt-primary)]">
            {metrics.documents.thisWeek}
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Total de Guías</CardTitle>
          <CardDescription className="text-sm text-[var(--kt-text-muted)]">
            Total de guías de valija registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-[var(--kt-text-muted)]">Total</p>
              <p className="text-lg font-semibold text-[var(--kt-primary)]">
                {metrics.guiasValija.total || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tipo de Remisiones</CardTitle>
          <CardDescription className="text-sm text-[var(--kt-text-muted)]">
            Comparación de remisiones por tipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-[var(--kt-text-muted)]">Entrada</p>
              <p className="text-lg font-semibold text-[var(--kt-info)]">
                {metrics.hojasRemision.byType["entrada"] || 0}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-[var(--kt-text-muted)]">Salida</p>
              <p className="text-lg font-semibold text-[var(--kt-warning)]">
                {metrics.hojasRemision.byType["salida"] || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
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
          cache: 'no-store',
          signal: abortController.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })

        if (!response.ok) {
          throw new Error('No se pudieron cargar las métricas')
        }

        const data = await response.json()

        if (mounted) {
          setMetrics(data)
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          if (mounted) {
            setError(err.message)
          }
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchMetrics()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [userId])

  if (loading) {
    return <div className="space-y-6"><div className="h-8 w-64 bg-gray-200 rounded animate-pulse" /></div>
  }

  if (error || !metrics) {
    return <ErrorComponent error={new Error(error || 'Error al cargar datos')} resetErrorBoundary={() => window.location.reload()} />
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorComponent}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">
            Bienvenido, Usuario!
          </h1>
          <p className="text-[var(--kt-text-muted)] mt-1">
            Resumen general de tu sistema de documentos
          </p>
        </div>

        <MetricsGrid metrics={metrics} />
        <StatusBreakdown metrics={metrics} />
        <QuickStats metrics={metrics} />
      </div>
    </ErrorBoundary>
  )
}