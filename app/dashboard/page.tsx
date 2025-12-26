import { auth } from "@/lib/auth-v4"
import { redirect } from "next/navigation"
import { getDashboardMetrics } from "@/lib/dashboard"
import StatCard from "@/components/cards/StatCard"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  const metrics = await getDashboardMetrics(session.user.id)

  // Calculate success rate
  const totalProcessed = metrics.documents.processingSuccess + metrics.documents.processingFailed
  const successRate = totalProcessed > 0
    ? Math.round((metrics.documents.processingSuccess / totalProcessed) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">
          Bienvenido, {session.user?.name || "Usuario"}!
        </h1>
        <p className="text-[var(--kt-text-muted)] mt-1">
          Resumen general de tu sistema de documentos
        </p>
      </div>

      {/* Metrics Grid */}
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

      {/* Status Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guías de Valija Status */}
        <Card>
          <CardHeader>
            <CardTitle>Guías de Valija por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.guiasValija.byStatus).length > 0 ? (
                Object.entries(metrics.guiasValija.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--kt-text-muted)] capitalize">
                      {status.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-semibold text-[var(--kt-text-dark)]">
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--kt-text-muted)]">
                  No hay guías registradas
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hojas de Remisión Status */}
        <Card>
          <CardHeader>
            <CardTitle>Hojas de Remisión por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.hojasRemision.byStatus).length > 0 ? (
                Object.entries(metrics.hojasRemision.byStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--kt-text-muted)] capitalize">
                      {status.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-semibold text-[var(--kt-text-dark)]">
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--kt-text-muted)]">
                  No hay hojas de remisión registradas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Documentos esta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[var(--kt-primary)]">
              {metrics.documents.thisWeek}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guías Entrada vs Salida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Entrada</p>
                <p className="text-lg font-semibold text-[var(--kt-info)]">
                  {metrics.guiasValija.byType["ENTRADA"] || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Salida</p>
                <p className="text-lg font-semibold text-[var(--kt-warning)]">
                  {metrics.guiasValija.byType["SALIDA"] || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tipo de Remisiones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Entrada</p>
                <p className="text-lg font-semibold text-[var(--kt-info)]">
                  {metrics.hojasRemision.byType["entrada"] || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--kt-text-muted)]">Salida</p>
                <p className="text-lg font-semibold text-[var(--kt-warning)]">
                  {metrics.hojasRemision.byType["salida"] || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
