"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Icon from "@/components/ui/Icon"
import { Package, Search, Filter, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"

interface GuiaValijaItem {
  id: string
  numeroItem: number
  destinatario: string
  contenido: string
  remitente?: string
  cantidad?: number
  peso?: number
  guiaValija: {
    id: string
    numeroGuia: string
    fechaEnvio: Date | null
    estado: string
  }
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

function getEstadoColor(estado: string) {
  switch (estado.toLowerCase()) {
    case "pendiente":
      return "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]"
    case "en_transito":
      return "bg-blue-100 text-blue-700"
    case "entregado":
      return "bg-[var(--kt-success-light)] text-[var(--kt-success)]"
    case "cancelado":
      return "bg-[var(--kt-danger-light)] text-[var(--kt-danger)]"
    default:
      return "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]"
  }
}

function getEstadoLabel(estado: string) {
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    en_transito: "En Tránsito",
    entregado: "Entregado",
    cancelado: "Cancelado",
  }
  return labels[estado] || estado
}

export default function GuiaValijaItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<GuiaValijaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    fechaDesde: "",
    fechaHasta: "",
    estado: "all",
    pesoMin: "",
    pesoMax: "",
  })
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  // Cargar items con filtros
  useEffect(() => {
    const abortController = new AbortController()
    let mounted = true

    async function fetchItems() {
      if (!mounted) return

      setLoading(true)
      try {
        const params = new URLSearchParams({
          search: searchTerm,
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
          ...Object.entries(filters).reduce((acc, [key, value]) => {
            if (value && value !== "all") acc[key] = value
            return acc
          }, {} as Record<string, string>),
        })

        const response = await fetch(`/api/guias-valija-items?${params}`, {
          signal: abortController.signal
        })

        if (!response.ok) throw new Error("Error al cargar items")

        const data = await response.json()

        if (mounted) {
          setItems(data.items)
          setPagination(data.pagination)
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          toast.error("Error al cargar items")
          logger.error(error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchItems()

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [searchTerm, filters, pagination.page, pagination.limit])

  function clearFilters() {
    setFilters({
      fechaDesde: "",
      fechaHasta: "",
      estado: "all",
      pesoMin: "",
      pesoMax: "",
    })
    setPagination({ ...pagination, page: 1 })
  }

  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination({ ...pagination, page: newPage })
    }
  }

  function exportToExcel() {
    toast.info("Función de exportación próximamente")
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Items de Valija</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">
            Items de Guía de Valija
          </h1>
          <p className="text-[var(--kt-text-muted)]">
            {pagination.total} items encontrados
            {pagination.totalPages > 1 && ` (página ${pagination.page} de ${pagination.totalPages})`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--kt-text-muted)]" />
            <Input
              placeholder="Buscar por destinatario, contenido, remitente..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPagination({ ...pagination, page: 1 })
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros Avanzados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="fechaDesde">Fecha Desde</Label>
                <Input
                  id="fechaDesde"
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) =>
                    setFilters({ ...filters, fechaDesde: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="fechaHasta">Fecha Hasta</Label>
                <Input
                  id="fechaHasta"
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) =>
                    setFilters({ ...filters, fechaHasta: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={filters.estado}
                  onValueChange={(value) =>
                    setFilters({ ...filters, estado: value })
                  }
                >
                  <SelectTrigger id="estado">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_transito">En Tránsito</SelectItem>
                    <SelectItem value="entregado">Entregado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pesoMin">Peso Mín (kg)</Label>
                <Input
                  id="pesoMin"
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={filters.pesoMin}
                  onChange={(e) =>
                    setFilters({ ...filters, pesoMin: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="pesoMax">Peso Máx (kg)</Label>
                <Input
                  id="pesoMax"
                  type="number"
                  step="0.001"
                  placeholder="999.999"
                  value={filters.pesoMax}
                  onChange={(e) =>
                    setFilters({ ...filters, pesoMax: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Datatable */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[var(--kt-text-muted)]">Cargando items...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-[var(--kt-text-muted)] mx-auto mb-4" />
              <p className="text-[var(--kt-text-muted)]">
                {searchTerm || filters.fechaDesde || filters.fechaHasta || filters.estado !== "all"
                  ? "No se encontraron items con los filtros aplicados"
                  : "No hay items registrados"}
              </p>
              {(searchTerm || filters.fechaDesde || filters.fechaHasta || filters.estado !== "all") && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={clearFilters}
                >
                  Limpiar Filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--kt-gray-200)]">
                <thead className="bg-[var(--kt-gray-50)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      N°
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Destinatario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Contenido
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Remitente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Peso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Guía
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Fecha Envío
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[var(--kt-gray-200)]">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--kt-gray-50)]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-[var(--kt-text-dark)]">
                          {item.numeroItem}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--kt-text-dark)]">
                          {item.destinatario}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {item.contenido.length > 50
                            ? item.contenido.substring(0, 50) + "..."
                            : item.contenido}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {item.remitente || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {item.cantidad || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {item.peso ? `${item.peso} kg` : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            router.push(`/guias-valija/${item.guiaValija.id}/view`)
                          }
                          className="text-sm text-[var(--kt-primary)] hover:text-[var(--kt-primary-dark)] hover:underline"
                        >
                          {item.guiaValija.numeroGuia}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {item.guiaValija.fechaEnvio
                            ? new Date(item.guiaValija.fechaEnvio).toLocaleDateString(
                                "es-PE"
                              )
                            : "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getEstadoColor(item.guiaValija.estado)}>
                          {getEstadoLabel(item.guiaValija.estado)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/guias-valija/${item.guiaValija.id}/view`)
                          }
                          title="Ver guía"
                        >
                          <Icon name="eye" size="sm" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {!loading && items.length > 0 && pagination.totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--kt-text-muted)]">
                Mostrando {(pagination.page - 1) * pagination.limit + 1} a{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{" "}
                {pagination.total} items
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-[var(--kt-text-muted)]">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
