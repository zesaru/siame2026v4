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
import {
  Package,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
} from "lucide-react"
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
      return "bg-zinc-100 text-zinc-700 border border-zinc-200"
    case "en_transito":
      return "bg-sky-100 text-sky-700 border border-sky-200"
    case "entregado":
      return "bg-emerald-100 text-emerald-700 border border-emerald-200"
    case "cancelado":
      return "bg-rose-100 text-rose-700 border border-rose-200"
    default:
      return "bg-zinc-100 text-zinc-700 border border-zinc-200"
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

function formatDate(date: Date | null) {
  if (!date) return "-"
  return new Date(date).toLocaleDateString("es-PE")
}

function formatWeight(weight?: number) {
  if (!weight && weight !== 0) return "-"
  return `${weight} kg`
}

export default function GuiaValijaItemsPage() {
  const router = useRouter()
  const [items, setItems] = useState<GuiaValijaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [jumpToPage, setJumpToPage] = useState("1")
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

  useEffect(() => {
    setJumpToPage(String(pagination.page))
  }, [pagination.page])

  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    Boolean(filters.fechaDesde) ||
    Boolean(filters.fechaHasta) ||
    filters.estado !== "all" ||
    Boolean(filters.pesoMin) ||
    Boolean(filters.pesoMax)

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = []

    if (searchTerm.trim()) {
      chips.push({
        key: "search",
        label: `Búsqueda: ${searchTerm.trim()}`,
        clear: () => setSearchTerm(""),
      })
    }

    if (filters.fechaDesde) {
      chips.push({
        key: "fechaDesde",
        label: `Desde: ${filters.fechaDesde}`,
        clear: () => setFilters((prev) => ({ ...prev, fechaDesde: "" })),
      })
    }

    if (filters.fechaHasta) {
      chips.push({
        key: "fechaHasta",
        label: `Hasta: ${filters.fechaHasta}`,
        clear: () => setFilters((prev) => ({ ...prev, fechaHasta: "" })),
      })
    }

    if (filters.estado !== "all") {
      chips.push({
        key: "estado",
        label: `Estado: ${getEstadoLabel(filters.estado)}`,
        clear: () => setFilters((prev) => ({ ...prev, estado: "all" })),
      })
    }

    if (filters.pesoMin) {
      chips.push({
        key: "pesoMin",
        label: `Peso mín: ${filters.pesoMin} kg`,
        clear: () => setFilters((prev) => ({ ...prev, pesoMin: "" })),
      })
    }

    if (filters.pesoMax) {
      chips.push({
        key: "pesoMax",
        label: `Peso máx: ${filters.pesoMax} kg`,
        clear: () => setFilters((prev) => ({ ...prev, pesoMax: "" })),
      })
    }

    return chips
  }, [searchTerm, filters])

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
          signal: abortController.signal,
        })

        if (!response.ok) throw new Error("Error al cargar items")

        const data = await response.json()

        if (mounted) {
          setItems(data.items)
          setPagination(data.pagination)
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
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
    setSearchTerm("")
    setFilters({
      fechaDesde: "",
      fechaHasta: "",
      estado: "all",
      pesoMin: "",
      pesoMax: "",
    })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }))
    }
  }

  function setPageSize(value: string) {
    setPagination((prev) => ({ ...prev, page: 1, limit: Number(value) }))
  }

  function goToPage() {
    const parsed = Number(jumpToPage)
    if (!Number.isFinite(parsed)) return
    const safePage = Math.min(Math.max(1, Math.floor(parsed)), Math.max(1, pagination.totalPages))
    changePage(safePage)
  }

  function exportToExcel() {
    toast.info("Exportación en construcción")
  }

  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const to = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="space-y-6 pb-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Panel</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Items de Valija</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <section className="rounded-xl border border-[var(--kt-gray-200)] bg-gradient-to-r from-white to-[var(--kt-gray-50)] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">Items de Guía de Valija</h1>
            <p className="text-sm text-[var(--kt-text-muted)]">
              {pagination.total} items encontrados
              {pagination.totalPages > 1 && ` · Página ${pagination.page}/${pagination.totalPages}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            </Button>
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </section>

      <div className="sticky top-3 z-20 space-y-3 rounded-xl border border-[var(--kt-gray-200)] bg-white/95 p-4 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--kt-text-muted)]" />
          <Input
            placeholder="Buscar por destinatario, contenido, remitente..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("")
                setPagination((prev) => ({ ...prev, page: 1 }))
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--kt-text-muted)] hover:text-[var(--kt-text-dark)]"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterChips.map((chip) => (
              <Badge key={chip.key} variant="secondary" className="gap-1 rounded-full px-3 py-1 text-xs">
                {chip.label}
                <button
                  type="button"
                  onClick={() => {
                    chip.clear()
                    setPagination((prev) => ({ ...prev, page: 1 }))
                  }}
                  className="rounded-full p-0.5 transition hover:bg-black/10"
                  aria-label={`Quitar filtro ${chip.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar todo
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros Avanzados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div>
                <Label htmlFor="fechaDesde">Fecha Desde</Label>
                <Input
                  id="fechaDesde"
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => setFilters((prev) => ({ ...prev, fechaDesde: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="fechaHasta">Fecha Hasta</Label>
                <Input
                  id="fechaHasta"
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => setFilters((prev) => ({ ...prev, fechaHasta: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={filters.estado}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, estado: value }))}
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
                  onChange={(e) => setFilters((prev) => ({ ...prev, pesoMin: e.target.value }))}
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
                  onChange={(e) => setFilters((prev) => ({ ...prev, pesoMax: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={clearFilters}>
                Limpiar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <div className="overflow-hidden rounded-md border border-[var(--kt-gray-200)]">
                <div className="hidden bg-[var(--kt-gray-50)] px-4 py-3 md:grid md:grid-cols-11 md:gap-4">
                  {Array.from({ length: 11 }).map((_, idx) => (
                    <div key={idx} className="h-4 animate-pulse rounded bg-[var(--kt-gray-200)]" />
                  ))}
                </div>
                <div className="space-y-3 p-4">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="h-10 animate-pulse rounded bg-[var(--kt-gray-100)]" />
                  ))}
                </div>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-14 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-[var(--kt-text-muted)]" />
              <h3 className="text-base font-semibold text-[var(--kt-text-dark)]">No hay resultados</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--kt-text-muted)]">
                {hasActiveFilters
                  ? "No encontramos items con los filtros actuales. Limpia o ajusta los criterios."
                  : "Aún no hay items registrados para mostrar."}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-[var(--kt-gray-200)]">
                {items.map((item, index) => {
                  const rowNumber = (pagination.page - 1) * pagination.limit + index + 1
                  return (
                  <div key={item.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--kt-text-dark)]">N° {rowNumber} · VAL-ITEM #{item.numeroItem}</p>
                        <p className="text-sm text-[var(--kt-text-muted)]">{item.destinatario}</p>
                      </div>
                      <Badge className={getEstadoColor(item.guiaValija.estado)}>
                        {getEstadoLabel(item.guiaValija.estado)}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--kt-text-muted)]">
                      {item.contenido.length > 100 ? `${item.contenido.substring(0, 100)}...` : item.contenido}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--kt-text-muted)]">
                      <span>Guía: {item.guiaValija.numeroGuia}</span>
                      <span>Fecha: {formatDate(item.guiaValija.fechaEnvio)}</span>
                      <span>Cantidad: {item.cantidad || "-"}</span>
                      <span>Peso: {formatWeight(item.peso)}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/guias-valija/${item.guiaValija.id}/view`)}
                    >
                      <Icon name="eye" size="sm" className="mr-2" />
                      Ver guía
                    </Button>
                  </div>
                )})}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-[var(--kt-gray-200)]">
                  <thead className="sticky top-0 z-10 bg-[var(--kt-gray-50)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">N°</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">N° VAL-ITEM</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">Destinatario</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">Contenido</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">Remitente</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">Cantidad</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">Peso</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">Guía</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">Fecha Envío</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">Estado</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--kt-text-muted)]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--kt-gray-200)] bg-white">
                    {items.map((item, index) => {
                      const rowNumber = (pagination.page - 1) * pagination.limit + index + 1
                      return (
                      <tr key={item.id} className={index % 2 === 0 ? "bg-white hover:bg-[var(--kt-gray-50)]" : "bg-[var(--kt-gray-50)]/40 hover:bg-[var(--kt-gray-50)]"}>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="text-sm font-semibold text-[var(--kt-text-dark)]">{rowNumber}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="text-sm font-semibold text-[var(--kt-text-dark)]">{item.numeroItem}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-[var(--kt-text-dark)]">{item.destinatario}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-[var(--kt-text-muted)]">
                            {item.contenido.length > 70 ? `${item.contenido.substring(0, 70)}...` : item.contenido}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-[var(--kt-text-muted)]">{item.remitente || "-"}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-[var(--kt-text-muted)]">{item.cantidad || "-"}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-[var(--kt-text-muted)]">{formatWeight(item.peso)}</td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <button
                            onClick={() => router.push(`/guias-valija/${item.guiaValija.id}/view`)}
                            className="text-sm font-medium text-[var(--kt-primary)] underline-offset-2 transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kt-primary)]"
                          >
                            {item.guiaValija.numeroGuia}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--kt-text-muted)]">{formatDate(item.guiaValija.fechaEnvio)}</td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <Badge className={getEstadoColor(item.guiaValija.estado)}>
                            {getEstadoLabel(item.guiaValija.estado)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/guias-valija/${item.guiaValija.id}/view`)}
                            title="Ver guía"
                            className="gap-2"
                          >
                            <Icon name="eye" size="sm" />
                            <span className="hidden lg:inline">Ver guía</span>
                          </Button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!loading && items.length > 0 && pagination.totalPages > 0 && (
        <Card className="sticky bottom-2 z-10 border-[var(--kt-gray-200)] bg-white/95 backdrop-blur">
          <CardContent className="pt-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-[var(--kt-text-muted)]">
                Mostrando {from} a {to} de {pagination.total} items
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={String(pagination.limit)} onValueChange={setPageSize}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue placeholder="Items/página" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 / página</SelectItem>
                    <SelectItem value="50">50 / página</SelectItem>
                    <SelectItem value="100">100 / página</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>

                <span className="text-sm text-[var(--kt-text-muted)]">{pagination.page} / {pagination.totalPages}</span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => changePage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, pagination.totalPages)}
                    value={jumpToPage}
                    onChange={(e) => setJumpToPage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goToPage()
                    }}
                    className="h-9 w-[90px]"
                  />
                  <Button variant="outline" size="sm" onClick={goToPage}>
                    Ir
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
