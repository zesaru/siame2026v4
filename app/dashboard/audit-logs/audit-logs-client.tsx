"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DocumentType, AuditAction } from "@/lib/services/file-audit.service"
import { logger } from "@/lib/logger"

interface AuditLog {
  id: string
  userId: string
  filePath: string
  action: AuditAction
  ipAddress: string | null
  userAgent: string | null
  documentType: DocumentType | null
  documentId: string | null
  documentTitle: string | null
  timestamp: Date
  user: {
    name: string | null
    email: string
    role: string
  }
}

interface CspReport {
  timestamp: string
  severity?: "high" | "medium" | "low"
  blockedUri: string | null
  violatedDirective: string | null
  effectiveDirective: string | null
  sourceFile: string | null
  disposition: string | null
  documentUri: string | null
  referrer: string | null
  userAgent: string | null
  ipAddress: string | null
}

interface SessionMetrics {
  activeSessions: number
  usersWithMultipleActiveSessions: number
  policyRevocations24h: number
  idleRevocations24h: number
}

interface SecurityAlert {
  code:
    | "LOGIN_FAILED_SPIKE"
    | "SESSION_POLICY_SPIKE"
    | "LOGIN_BLOCKED_IP_SPIKE"
    | "PASSWORD_CHANGE_FAILED_SPIKE"
    | "PASSWORD_CHANGE_BLOCKED_SPIKE"
    | "SIGNUP_BLOCKED_SPIKE"
  severity: "high" | "medium"
  title: string
  message: string
  windowMinutes: number
  currentCount: number
  threshold: number
  topIp: string | null
}

interface QuarantinedIp {
  ipAddress: string
  failedCount: number
  lastAttemptAt: string
  overrideActive: boolean
  overrideId: string | null
  overrideExpiresAt: string | null
}

interface SecurityIncident {
  id: string
  timestamp: string
  action: string
  severity: "high" | "medium" | "low"
  priority: number
  ageMinutes: number
  slaTargetMinutes: number
  slaBreached: boolean
  status: "open" | "ack" | "resolved"
  note: string | null
  updatedAt: string | null
  ipAddress: string | null
  userEmail: string | null
  title: string
  details: string | null
}

interface IncidentStats {
  open: number
  ack: number
  resolved: number
  openSlaBreached: number
}

interface NotificationDelivery {
  id: string
  channel: string
  eventKey: string
  status: string
  source: string
  attemptCount: number
  breachCount: number
  httpStatusCode: number | null
  errorMessage: string | null
  createdAt: string
}

const documentTypeColors: Record<string, string> = {
  GUIA_VALIJA: "bg-blue-100 text-blue-800",
  HOJA_REMISION: "bg-green-100 text-green-800",
  OFICIO: "bg-orange-100 text-orange-800",
  DOCUMENT: "bg-purple-100 text-purple-800",
  FILE: "bg-gray-100 text-gray-800",
  AUTH: "bg-rose-100 text-rose-800",
}

const documentTypeLabels: Record<string, string> = {
  GUIA_VALIJA: "Guía de Valija",
  HOJA_REMISION: "Hoja de Remisión",
  OFICIO: "Oficio",
  DOCUMENT: "Documento",
  FILE: "Archivo",
  AUTH: "Autenticación",
}

const actionColors: Record<string, string> = {
  VIEW: "bg-indigo-100 text-indigo-800",
  UPLOAD: "bg-green-100 text-green-800",
  DOWNLOAD: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  COPY: "bg-yellow-100 text-yellow-800",
  UPDATE: "bg-amber-100 text-amber-800",
  LOGIN_SUCCESS: "bg-emerald-100 text-emerald-800",
  LOGIN_FAILED: "bg-red-100 text-red-800",
  LOGIN_BLOCKED: "bg-rose-100 text-rose-800",
  SIGNUP_SUCCESS: "bg-green-100 text-green-800",
  SIGNUP_BLOCKED: "bg-fuchsia-100 text-fuchsia-800",
  PASSWORD_CHANGE_FAILED: "bg-red-100 text-red-800",
  PASSWORD_CHANGE_BLOCKED: "bg-rose-100 text-rose-800",
  SESSION_REVOKED_SELF: "bg-orange-100 text-orange-800",
  SESSION_REVOKED_ADMIN: "bg-amber-100 text-amber-800",
  SESSION_REVOKED_POLICY: "bg-zinc-100 text-zinc-800",
  IP_OVERRIDE_ALLOW_ADDED: "bg-cyan-100 text-cyan-800",
  IP_OVERRIDE_ALLOW_REVOKED: "bg-sky-100 text-sky-800",
}

const actionLabels: Record<string, string> = {
  VIEW: "Ver",
  UPLOAD: "Subir",
  DOWNLOAD: "Descargar",
  DELETE: "Eliminar",
  COPY: "Copiar",
  UPDATE: "Actualizar",
  LOGIN_SUCCESS: "Login exitoso",
  LOGIN_FAILED: "Login fallido",
  LOGIN_BLOCKED: "Login bloqueado",
  SIGNUP_SUCCESS: "Signup exitoso",
  SIGNUP_BLOCKED: "Signup bloqueado",
  PASSWORD_CHANGE_FAILED: "Cambio de contraseña fallido",
  PASSWORD_CHANGE_BLOCKED: "Cambio de contraseña bloqueado",
  SESSION_REVOKED_SELF: "Sesiones cerradas (propio usuario)",
  SESSION_REVOKED_ADMIN: "Sesiones cerradas (admin)",
  SESSION_REVOKED_POLICY: "Sesión cerrada por política",
  IP_OVERRIDE_ALLOW_ADDED: "Override ALLOW de IP",
  IP_OVERRIDE_ALLOW_REVOKED: "Override ALLOW revocado",
}

const cspSeverityClass: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-700",
}

const cspSeverityLabel: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
}

export default function AuditLogsClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null)
  const [sessionMetricsLoading, setSessionMetricsLoading] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([])
  const [securityAlertsLoading, setSecurityAlertsLoading] = useState(true)
  const [quarantinedIps, setQuarantinedIps] = useState<QuarantinedIp[]>([])
  const [quarantinedIpsLoading, setQuarantinedIpsLoading] = useState(true)
  const [ipUnblockMinutes, setIpUnblockMinutes] = useState("120")
  const [incidents, setIncidents] = useState<SecurityIncident[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(true)
  const [incidentsTotal, setIncidentsTotal] = useState(0)
  const [incidentStats, setIncidentStats] = useState<IncidentStats>({
    open: 0,
    ack: 0,
    resolved: 0,
    openSlaBreached: 0,
  })
  const [incidentsPage, setIncidentsPage] = useState(0)
  const [incidentsStatusFilter, setIncidentsStatusFilter] = useState<"all" | "open" | "ack" | "resolved">("all")
  const [incidentsOnlyBreached, setIncidentsOnlyBreached] = useState(false)
  const [notifyingIncidents, setNotifyingIncidents] = useState(false)
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([])
  const [deliveriesLoading, setDeliveriesLoading] = useState(true)
  const [incidentsStartDate, setIncidentsStartDate] = useState("")
  const [incidentsEndDate, setIncidentsEndDate] = useState("")
  const [cspReports, setCspReports] = useState<CspReport[]>([])
  const [cspLoading, setCspLoading] = useState(true)
  const [cspTotal, setCspTotal] = useState(0)
  const [cspDirectiveFilter, setCspDirectiveFilter] = useState("")
  const [cspSeverityFilter, setCspSeverityFilter] = useState<"all" | "high" | "medium" | "low">("all")
  const [cspStartDate, setCspStartDate] = useState("")
  const [cspEndDate, setCspEndDate] = useState("")
  const [cspPage, setCspPage] = useState(0)
  const [cspReloadKey, setCspReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  // Filters
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [userSearch, setUserSearch] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const pageSize = 50
  const incidentsPageSize = 20
  const cspPageSize = 20

  const cspTotalPages = Math.max(1, Math.ceil(cspTotal / cspPageSize))
  const incidentsTotalPages = Math.max(1, Math.ceil(incidentsTotal / incidentsPageSize))

  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchSessionMetrics() {
      if (!mounted) return
      setSessionMetricsLoading(true)
      try {
        const response = await fetch("/api/admin/security/session-metrics", {
          signal: abortController.signal,
        })
        if (!response.ok) throw new Error("Failed to fetch session metrics")
        const data = await response.json()
        if (mounted) {
          setSessionMetrics({
            activeSessions: Number(data.activeSessions || 0),
            usersWithMultipleActiveSessions: Number(data.usersWithMultipleActiveSessions || 0),
            policyRevocations24h: Number(data.policyRevocations24h || 0),
            idleRevocations24h: Number(data.idleRevocations24h || 0),
          })
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          logger.error("Error fetching session metrics:", error)
        }
      } finally {
        if (mounted) setSessionMetricsLoading(false)
      }
    }

    fetchSessionMetrics()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [cspReloadKey])

  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchIncidents() {
      if (!mounted) return
      setIncidentsLoading(true)
      try {
        const params = new URLSearchParams({
          limit: String(incidentsPageSize),
          offset: String(incidentsPage * incidentsPageSize),
        })
        if (incidentsStatusFilter !== "all") params.append("status", incidentsStatusFilter)
        if (incidentsOnlyBreached) params.append("slaBreached", "true")
        if (incidentsStartDate) params.append("startDate", incidentsStartDate)
        if (incidentsEndDate) params.append("endDate", incidentsEndDate)
        const response = await fetch(`/api/admin/security/incidents?${params.toString()}`, {
          signal: abortController.signal,
        })
        if (!response.ok) throw new Error("Failed to fetch incidents")
        const data = await response.json()
        if (mounted) {
          setIncidents(Array.isArray(data.incidents) ? data.incidents : [])
          setIncidentsTotal(Number(data.total || 0))
          setIncidentStats({
            open: Number(data.stats?.open || 0),
            ack: Number(data.stats?.ack || 0),
            resolved: Number(data.stats?.resolved || 0),
            openSlaBreached: Number(data.stats?.openSlaBreached || 0),
          })
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          logger.error("Error fetching incidents:", error)
        }
      } finally {
        if (mounted) setIncidentsLoading(false)
      }
    }

    fetchIncidents()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [cspReloadKey, incidentsEndDate, incidentsOnlyBreached, incidentsPage, incidentsPageSize, incidentsStartDate, incidentsStatusFilter])

  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchDeliveries() {
      if (!mounted) return
      setDeliveriesLoading(true)
      try {
        const response = await fetch("/api/admin/security/notification-deliveries?limit=20", {
          signal: abortController.signal,
        })
        if (!response.ok) throw new Error("Failed to fetch deliveries")
        const data = await response.json()
        if (mounted) setDeliveries(Array.isArray(data.deliveries) ? data.deliveries : [])
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          logger.error("Error fetching deliveries:", error)
        }
      } finally {
        if (mounted) setDeliveriesLoading(false)
      }
    }

    fetchDeliveries()
    return () => {
      mounted = false
      abortController.abort()
    }
  }, [cspReloadKey])

  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchQuarantinedIps() {
      if (!mounted) return
      setQuarantinedIpsLoading(true)
      try {
        const response = await fetch("/api/admin/security/quarantined-ips?limit=30", {
          signal: abortController.signal,
        })
        if (!response.ok) throw new Error("Failed to fetch quarantined IPs")
        const data = await response.json()
        if (mounted) setQuarantinedIps(Array.isArray(data.items) ? data.items : [])
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          logger.error("Error fetching quarantined IPs:", error)
        }
      } finally {
        if (mounted) setQuarantinedIpsLoading(false)
      }
    }

    fetchQuarantinedIps()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [cspReloadKey])

  async function handleUnblockIp(ipAddress: string) {
    try {
      const minutes = Number(ipUnblockMinutes)
      const durationMinutes = Number.isFinite(minutes) ? Math.max(1, Math.trunc(minutes)) : 120

      const response = await fetch("/api/admin/security/quarantined-ips/unblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress,
          durationMinutes,
          reason: "dashboard-manual-unblock",
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "No se pudo desbloquear IP")

      setCspReloadKey((prev) => prev + 1)
    } catch (error) {
      logger.error("Error unblocking IP:", error)
    }
  }

  async function handleRevokeIpOverride(overrideId: string) {
    try {
      const response = await fetch(`/api/admin/security/quarantined-ips/unblock/${overrideId}`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "No se pudo revocar override")
      setCspReloadKey((prev) => prev + 1)
    } catch (error) {
      logger.error("Error revoking IP override:", error)
    }
  }

  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchSecurityAlerts() {
      if (!mounted) return
      setSecurityAlertsLoading(true)
      try {
        const response = await fetch("/api/admin/security/alerts", {
          signal: abortController.signal,
        })
        if (!response.ok) throw new Error("Failed to fetch security alerts")
        const data = await response.json()
        if (mounted) setSecurityAlerts(Array.isArray(data.alerts) ? data.alerts : [])
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          logger.error("Error fetching security alerts:", error)
        }
      } finally {
        if (mounted) setSecurityAlertsLoading(false)
      }
    }

    fetchSecurityAlerts()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [cspReloadKey])

  useEffect(() => {
    let mounted = true
    const abortController = new AbortController()

    async function fetchCspReports() {
      if (!mounted) return

      setCspLoading(true)
      try {
        const params = new URLSearchParams({
          limit: String(cspPageSize),
          offset: String(cspPage * cspPageSize),
          sortBy: "severity",
        })
        if (cspDirectiveFilter.trim()) params.append("directive", cspDirectiveFilter.trim())
        if (cspSeverityFilter !== "all") params.append("severity", cspSeverityFilter)
        if (cspStartDate) params.append("startDate", cspStartDate)
        if (cspEndDate) params.append("endDate", cspEndDate)

        const response = await fetch(`/api/admin/security/csp-reports?${params.toString()}`, {
          signal: abortController.signal,
        })
        if (!response.ok) throw new Error("Failed to fetch CSP reports")
        const data = await response.json()
        if (mounted) {
          setCspReports(Array.isArray(data.reports) ? data.reports : [])
          setCspTotal(Number(data.total || 0))
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          logger.error("Error fetching CSP reports:", error)
        }
      } finally {
        if (mounted) {
          setCspLoading(false)
        }
      }
    }

    fetchCspReports()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [cspDirectiveFilter, cspEndDate, cspPage, cspPageSize, cspReloadKey, cspSeverityFilter, cspStartDate])

  useEffect(() => {
    const abortController = new AbortController()
    let mounted = true

    async function fetchLogs() {
      if (!mounted) return

      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: pageSize.toString(),
          offset: (page * pageSize).toString(),
        })

        if (documentTypeFilter !== "all") params.append("documentType", documentTypeFilter)
        if (actionFilter !== "all") params.append("action", actionFilter)
        if (userSearch) params.append("userSearch", userSearch)
        if (startDate) params.append("startDate", startDate)
        if (endDate) params.append("endDate", endDate)

        const response = await fetch(`/api/admin/audit-logs?${params}`, {
          signal: abortController.signal
        })

        if (!response.ok) throw new Error("Failed to fetch audit logs")

        const data = await response.json()

        if (mounted) {
          setLogs(data.logs)
          setTotal(data.total)
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          logger.error("Error fetching audit logs:", error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchLogs()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [page, documentTypeFilter, actionFilter, userSearch, startDate, endDate, pageSize])

  function formatDate(date: Date | string): string {
    const d = new Date(date)
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  function exportToCSV() {
    const headers = ["Fecha", "Usuario", "Email", "Acción", "Tipo", "Título", "IP"]
    const rows = logs.map((log) => [
      formatDate(log.timestamp),
      log.user.name || "-",
      log.user.email,
      actionLabels[log.action] || log.action,
      log.documentType ? documentTypeLabels[log.documentType] || log.documentType : "-",
      log.documentTitle || "-",
      log.ipAddress || "-",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `audit-logs-${new Date().toISOString()}.csv`
    link.click()
  }

  async function exportIncidentsToCSV() {
    try {
      const params = new URLSearchParams({
        limit: "1000",
        offset: "0",
      })
      if (incidentsStatusFilter !== "all") params.append("status", incidentsStatusFilter)
      if (incidentsOnlyBreached) params.append("slaBreached", "true")
      if (incidentsStartDate) params.append("startDate", incidentsStartDate)
      if (incidentsEndDate) params.append("endDate", incidentsEndDate)

      const response = await fetch(`/api/admin/security/incidents?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to export incidents")
      const data = await response.json()
      const rows: SecurityIncident[] = Array.isArray(data.incidents) ? data.incidents : []

      const headers = ["Fecha", "Severidad", "Estado", "Prioridad", "SLA", "Accion", "Usuario", "IP", "Titulo", "Detalles"]
      const csvRows = rows.map((row) => [
        formatDate(row.timestamp),
        row.severity,
        row.status,
        row.priority,
        `${row.ageMinutes}/${row.slaTargetMinutes}${row.slaBreached ? " BREACH" : ""}`,
        row.action,
        row.userEmail || "-",
        row.ipAddress || "-",
        row.title || "-",
        row.details || "-",
      ])
      const csvContent = [
        headers.join(","),
        ...csvRows.map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `security-incidents-${new Date().toISOString()}.csv`
      link.click()
    } catch (error) {
      logger.error("Error exporting incidents:", error)
    }
  }

  async function updateIncidentStatus(id: string, status: "open" | "ack" | "resolved") {
    try {
      const response = await fetch(`/api/admin/security/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar estado")

      setIncidents((prev) =>
        prev.map((incident) =>
          incident.id === id
            ? {
                ...incident,
                status,
                updatedAt: new Date().toISOString(),
              }
            : incident,
        ),
      )
    } catch (error) {
      logger.error("Error updating incident status:", error)
    }
  }

  async function notifySlaBreaches(force = false) {
    try {
      setNotifyingIncidents(true)
      const response = await fetch("/api/admin/security/incidents/notify-sla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "No se pudo notificar")
      setCspReloadKey((prev) => prev + 1)
    } catch (error) {
      logger.error("Error notifying SLA breaches:", error)
    } finally {
      setNotifyingIncidents(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Alertas de Seguridad (15m)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCspReloadKey((prev) => prev + 1)}
            >
              Refrescar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {securityAlertsLoading ? (
            <p className="text-sm text-muted-foreground">Evaluando alertas...</p>
          ) : securityAlerts.length === 0 ? (
            <div className="rounded-md border p-4 text-sm text-emerald-700 bg-emerald-50">
              Sin alertas activas en la ventana actual.
            </div>
          ) : (
            <div className="space-y-3">
              {securityAlerts.map((alert) => (
                <div
                  key={alert.code}
                  className={`rounded-md border p-4 ${
                    alert.severity === "high"
                      ? "border-red-300 bg-red-50"
                      : "border-amber-300 bg-amber-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                    <Badge className={alert.severity === "high" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>
                      {alert.severity === "high" ? "Alta" : "Media"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Top IP: {alert.topIp || "-"} | Conteo: {alert.currentCount} | Umbral: {alert.threshold}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl">Incidentes de Seguridad</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => notifySlaBreaches(false)}
                disabled={notifyingIncidents}
              >
                {notifyingIncidents ? "Notificando..." : "Notificar SLA"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => notifySlaBreaches(true)}
                disabled={notifyingIncidents}
              >
                Forzar notificación
              </Button>
              <Button variant="outline" size="sm" onClick={exportIncidentsToCSV}>
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Abiertos</p>
              <p className="text-xl font-semibold">{incidentStats.open}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Acusados</p>
              <p className="text-xl font-semibold">{incidentStats.ack}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Resueltos</p>
              <p className="text-xl font-semibold">{incidentStats.resolved}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">SLA vencido (abiertos)</p>
              <p className="text-xl font-semibold text-red-700">{incidentStats.openSlaBreached}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="space-y-2">
              <Label htmlFor="incident-status">Estado</Label>
              <Select
                value={incidentsStatusFilter}
                onValueChange={(value) => {
                  setIncidentsStatusFilter(value as "all" | "open" | "ack" | "resolved")
                  setIncidentsPage(0)
                }}
              >
                <SelectTrigger id="incident-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Abiertos</SelectItem>
                  <SelectItem value="ack">Acusados</SelectItem>
                  <SelectItem value="resolved">Resueltos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident-start">Desde</Label>
              <Input
                id="incident-start"
                type="date"
                value={incidentsStartDate}
                onChange={(e) => {
                  setIncidentsStartDate(e.target.value)
                  setIncidentsPage(0)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident-end">Hasta</Label>
              <Input
                id="incident-end"
                type="date"
                value={incidentsEndDate}
                onChange={(e) => {
                  setIncidentsEndDate(e.target.value)
                  setIncidentsPage(0)
                }}
              />
            </div>
          </div>
          <div className="mb-4">
            <Button
              size="sm"
              variant={incidentsOnlyBreached ? "default" : "outline"}
              onClick={() => {
                setIncidentsOnlyBreached((v) => !v)
                setIncidentsPage(0)
              }}
            >
              {incidentsOnlyBreached ? "Mostrando solo SLA vencido" : "Filtrar SLA vencido"}
            </Button>
          </div>

          {incidentsLoading ? (
            <p className="text-sm text-muted-foreground">Cargando incidentes...</p>
          ) : incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay incidentes para el rango seleccionado.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead className="text-right">Gestión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow
                      key={incident.id}
                      className={incident.slaBreached ? "bg-red-50/60" : undefined}
                    >
                      <TableCell>{formatDate(incident.timestamp)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            incident.severity === "high"
                              ? "bg-red-100 text-red-800"
                              : incident.severity === "medium"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                          }
                        >
                          {incident.severity === "high" ? "Alta" : incident.severity === "medium" ? "Media" : "Baja"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{incident.priority}</TableCell>
                      <TableCell>
                        <Badge className={incident.slaBreached ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}>
                          {incident.ageMinutes} / {incident.slaTargetMinutes} min
                        </Badge>
                      </TableCell>
                      <TableCell>{actionLabels[incident.action] || incident.action}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            incident.status === "resolved"
                              ? "bg-emerald-100 text-emerald-800"
                              : incident.status === "ack"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                          }
                        >
                          {incident.status === "resolved" ? "Resuelto" : incident.status === "ack" ? "Acusado" : "Abierto"}
                        </Badge>
                      </TableCell>
                      <TableCell>{incident.userEmail || "-"}</TableCell>
                      <TableCell>{incident.ipAddress || "-"}</TableCell>
                      <TableCell className="max-w-[360px] truncate" title={incident.details || incident.title || "-"}>
                        {incident.details || incident.title || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateIncidentStatus(incident.id, "open")}
                            disabled={incident.status === "open"}
                          >
                            Abrir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateIncidentStatus(incident.id, "ack")}
                            disabled={incident.status === "ack"}
                          >
                            Acusar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateIncidentStatus(incident.id, "resolved")}
                            disabled={incident.status === "resolved"}
                          >
                            Resolver
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {incidentsTotal > incidentsPageSize && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Página {incidentsPage + 1} de {incidentsTotalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIncidentsPage((p) => Math.max(0, p - 1))}
                  disabled={incidentsPage === 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIncidentsPage((p) => p + 1)}
                  disabled={(incidentsPage + 1) * incidentsPageSize >= incidentsTotal}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Entregas de Notificación</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCspReloadKey((prev) => prev + 1)}
            >
              Refrescar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {deliveriesLoading ? (
            <p className="text-sm text-muted-foreground">Cargando entregas...</p>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin entregas registradas.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead>Intentos</TableHead>
                    <TableHead>Brechas</TableHead>
                    <TableHead>HTTP</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{formatDate(d.createdAt)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            d.status === "sent"
                              ? "bg-emerald-100 text-emerald-800"
                              : d.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-700"
                          }
                        >
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.source}</TableCell>
                      <TableCell>{d.attemptCount}</TableCell>
                      <TableCell>{d.breachCount}</TableCell>
                      <TableCell>{d.httpStatusCode || "-"}</TableCell>
                      <TableCell className="max-w-[320px] truncate" title={d.errorMessage || "-"}>
                        {d.errorMessage || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Métricas de Sesión (24h)</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCspReloadKey((prev) => prev + 1)}
            >
              Refrescar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sessionMetricsLoading ? (
            <p className="text-sm text-muted-foreground">Cargando métricas...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Sesiones activas</p>
                <p className="text-2xl font-semibold">{sessionMetrics?.activeSessions ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Usuarios multi-sesión</p>
                <p className="text-2xl font-semibold">{sessionMetrics?.usersWithMultipleActiveSessions ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Revocaciones política</p>
                <p className="text-2xl font-semibold">{sessionMetrics?.policyRevocations24h ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Revocaciones por inactividad</p>
                <p className="text-2xl font-semibold">{sessionMetrics?.idleRevocations24h ?? 0}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">IPs en Cuarentena</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="ip-unblock-min" className="text-xs text-muted-foreground">Duración desbloqueo (min)</Label>
              <Input
                id="ip-unblock-min"
                type="number"
                min={1}
                className="w-24 h-8"
                value={ipUnblockMinutes}
                onChange={(e) => setIpUnblockMinutes(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCspReloadKey((prev) => prev + 1)}
              >
                Refrescar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {quarantinedIpsLoading ? (
            <p className="text-sm text-muted-foreground">Cargando IPs en cuarentena...</p>
          ) : quarantinedIps.length === 0 ? (
            <p className="text-sm text-emerald-700">Sin IPs en cuarentena actualmente.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead>Fallos (ventana)</TableHead>
                    <TableHead>Último intento</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quarantinedIps.map((item) => (
                    <TableRow key={item.ipAddress}>
                      <TableCell className="font-mono">{item.ipAddress}</TableCell>
                      <TableCell>{item.failedCount}</TableCell>
                      <TableCell>{formatDate(item.lastAttemptAt)}</TableCell>
                      <TableCell>
                        {item.overrideActive ? (
                          <Badge className="bg-cyan-100 text-cyan-800">
                            ALLOW hasta {item.overrideExpiresAt ? formatDate(item.overrideExpiresAt) : "-"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Sin override</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnblockIp(item.ipAddress)}
                          >
                            Desbloquear
                          </Button>
                          {item.overrideActive && item.overrideId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeIpOverride(item.overrideId)}
                            >
                              Revocar override
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Logs de Auditoría</CardTitle>
            <div className="text-sm text-muted-foreground">
              {total} registros encontrados
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="document-type">Tipo de Documento</Label>
              <Select
                value={documentTypeFilter}
                onValueChange={setDocumentTypeFilter}
              >
                <SelectTrigger id="document-type">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="GUIA_VALIJA">Guía de Valija</SelectItem>
                  <SelectItem value="HOJA_REMISION">Hoja de Remisión</SelectItem>
                  <SelectItem value="OFICIO">Oficio</SelectItem>
                  <SelectItem value="DOCUMENT">Documento</SelectItem>
                  <SelectItem value="FILE">Archivo</SelectItem>
                  <SelectItem value="AUTH">Autenticación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Acción</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="VIEW">Ver</SelectItem>
                  <SelectItem value="UPLOAD">Subir</SelectItem>
                  <SelectItem value="DOWNLOAD">Descargar</SelectItem>
                  <SelectItem value="DELETE">Eliminar</SelectItem>
                  <SelectItem value="COPY">Copiar</SelectItem>
                  <SelectItem value="UPDATE">Actualizar</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">Login exitoso</SelectItem>
                  <SelectItem value="LOGIN_FAILED">Login fallido</SelectItem>
                  <SelectItem value="LOGIN_BLOCKED">Login bloqueado</SelectItem>
                  <SelectItem value="SIGNUP_SUCCESS">Signup exitoso</SelectItem>
                  <SelectItem value="SIGNUP_BLOCKED">Signup bloqueado</SelectItem>
                  <SelectItem value="PASSWORD_CHANGE_FAILED">Cambio de contraseña fallido</SelectItem>
                  <SelectItem value="PASSWORD_CHANGE_BLOCKED">Cambio de contraseña bloqueado</SelectItem>
                  <SelectItem value="SESSION_REVOKED_SELF">Sesiones cerradas (propio usuario)</SelectItem>
                  <SelectItem value="SESSION_REVOKED_ADMIN">Sesiones cerradas (admin)</SelectItem>
                  <SelectItem value="SESSION_REVOKED_POLICY">Sesión cerrada por política</SelectItem>
                  <SelectItem value="IP_OVERRIDE_ALLOW_ADDED">Override ALLOW de IP</SelectItem>
                  <SelectItem value="IP_OVERRIDE_ALLOW_REVOKED">Override ALLOW revocado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-search">Usuario</Label>
              <Input
                id="user-search"
                placeholder="Buscar por email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Desde"
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Hasta"
                />
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end mb-4">
            <Button onClick={exportToCSV} variant="outline">
              Exportar a CSV
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[var(--kt-text-muted)]">Cargando logs...</p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableCaption>
                  Registro de auditoría ({total} registros)
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No se encontraron registros
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.user.name || "-"}</div>
                            <div className="text-sm text-muted-foreground">
                              {log.user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={actionColors[log.action]}>
                            {actionLabels[log.action] || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.documentType ? (
                            <Badge className={documentTypeColors[log.documentType]}>
                              {documentTypeLabels[log.documentType] || log.documentType}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.documentTitle || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.ipAddress || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} de {total}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * pageSize >= total}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">CSP Reports</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCspPage(0)
                setCspReloadKey((prev) => prev + 1)
              }}
            >
              Refrescar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="space-y-2">
              <Label htmlFor="csp-directive">Directiva</Label>
              <Input
                id="csp-directive"
                placeholder="Ej: script-src"
                value={cspDirectiveFilter}
                onChange={(e) => {
                  setCspDirectiveFilter(e.target.value)
                  setCspPage(0)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="csp-start">Desde</Label>
              <Input
                id="csp-start"
                type="date"
                value={cspStartDate}
                onChange={(e) => {
                  setCspStartDate(e.target.value)
                  setCspPage(0)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="csp-end">Hasta</Label>
              <Input
                id="csp-end"
                type="date"
                value={cspEndDate}
                onChange={(e) => {
                  setCspEndDate(e.target.value)
                  setCspPage(0)
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              size="sm"
              variant={cspSeverityFilter === "all" ? "default" : "outline"}
              onClick={() => {
                setCspSeverityFilter("all")
                setCspPage(0)
              }}
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={cspSeverityFilter === "high" ? "default" : "outline"}
              onClick={() => {
                setCspSeverityFilter("high")
                setCspPage(0)
              }}
            >
              Alta
            </Button>
            <Button
              size="sm"
              variant={cspSeverityFilter === "medium" ? "default" : "outline"}
              onClick={() => {
                setCspSeverityFilter("medium")
                setCspPage(0)
              }}
            >
              Media
            </Button>
            <Button
              size="sm"
              variant={cspSeverityFilter === "low" ? "default" : "outline"}
              onClick={() => {
                setCspSeverityFilter("low")
                setCspPage(0)
              }}
            >
              Baja
            </Button>
          </div>

          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const params = new URLSearchParams({
                    limit: "1000",
                    offset: "0",
                    sortBy: "severity",
                  })
                  if (cspDirectiveFilter.trim()) params.append("directive", cspDirectiveFilter.trim())
                  if (cspSeverityFilter !== "all") params.append("severity", cspSeverityFilter)
                  if (cspStartDate) params.append("startDate", cspStartDate)
                  if (cspEndDate) params.append("endDate", cspEndDate)

                  const response = await fetch(`/api/admin/security/csp-reports?${params.toString()}`)
                  if (!response.ok) throw new Error("Failed to export CSP reports")
                  const data = await response.json()
                  const rows: CspReport[] = Array.isArray(data.reports) ? data.reports : []

                  const headers = ["Fecha", "Severidad", "Directiva Efectiva", "Directiva Violada", "Recurso Bloqueado", "Página", "IP"]
                  const exportRows = rows.map((r) => [
                    formatDate(r.timestamp),
                    cspSeverityLabel[r.severity || "low"] || "Baja",
                    r.effectiveDirective || "",
                    r.violatedDirective || "",
                    r.blockedUri || "",
                    r.documentUri || r.sourceFile || "",
                    r.ipAddress || "",
                  ])

                  const csvContent = [
                    headers.join(","),
                    ...exportRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
                  ].join("\n")

                  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
                  const link = document.createElement("a")
                  link.href = URL.createObjectURL(blob)
                  link.download = `csp-reports-${new Date().toISOString()}.csv`
                  link.click()
                } catch (error) {
                  logger.error("Error exporting CSP reports:", error)
                }
              }}
            >
              Exportar CSP CSV
            </Button>
          </div>

          {cspLoading ? (
            <div className="py-8">
              <LoadingSpinner message="Cargando reportes CSP..." />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Directiva</TableHead>
                    <TableHead>Recurso Bloqueado</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cspReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay reportes CSP registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    cspReports.map((report, index) => (
                      <TableRow key={`${report.timestamp}-${index}`}>
                        <TableCell className="font-medium">{formatDate(report.timestamp)}</TableCell>
                        <TableCell>
                          <Badge className={cspSeverityClass[report.severity || "low"]}>
                            {cspSeverityLabel[report.severity || "low"] || "Baja"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {report.effectiveDirective || report.violatedDirective || "-"}
                        </TableCell>
                        <TableCell className="text-sm break-all">{report.blockedUri || "-"}</TableCell>
                        <TableCell className="text-sm break-all">{report.documentUri || report.sourceFile || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{report.ipAddress || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {cspTotal > cspPageSize && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {cspPage * cspPageSize + 1} - {Math.min((cspPage + 1) * cspPageSize, cspTotal)} de {cspTotal}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCspPage((prev) => Math.max(0, prev - 1))}
                  disabled={cspPage === 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCspPage((prev) => Math.min(cspTotalPages - 1, prev + 1))}
                  disabled={cspPage >= cspTotalPages - 1}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
