"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const documentTypeColors: Record<string, string> = {
  GUIA_VALIJA: "bg-blue-100 text-blue-800",
  HOJA_REMISION: "bg-green-100 text-green-800",
  DOCUMENT: "bg-purple-100 text-purple-800",
  FILE: "bg-gray-100 text-gray-800",
}

const documentTypeLabels: Record<string, string> = {
  GUIA_VALIJA: "Guía de Valija",
  HOJA_REMISION: "Hoja de Remisión",
  DOCUMENT: "Documento",
  FILE: "Archivo",
}

const actionColors: Record<string, string> = {
  VIEW: "bg-indigo-100 text-indigo-800",
  UPLOAD: "bg-green-100 text-green-800",
  DOWNLOAD: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  COPY: "bg-yellow-100 text-yellow-800",
}

const actionLabels: Record<string, string> = {
  VIEW: "Ver",
  UPLOAD: "Subir",
  DOWNLOAD: "Descargar",
  DELETE: "Eliminar",
  COPY: "Copiar",
}

export default function AuditLogsClient() {
  const [logs, setLogs] = useState<AuditLog[]>([])
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

  useEffect(() => {
    fetchLogs()
  }, [page, documentTypeFilter, actionFilter, userSearch, startDate, endDate])

  async function fetchLogs() {
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

      const response = await fetch(`/api/admin/audit-logs?${params}`)
      if (!response.ok) throw new Error("Failed to fetch audit logs")

      const data = await response.json()
      setLogs(data.logs)
      setTotal(data.total)
    } catch (error) {
      logger.error("Error fetching audit logs:", error)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="space-y-6">
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
                  <SelectItem value="DOCUMENT">Documento</SelectItem>
                  <SelectItem value="FILE">Archivo</SelectItem>
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
    </div>
  )
}
