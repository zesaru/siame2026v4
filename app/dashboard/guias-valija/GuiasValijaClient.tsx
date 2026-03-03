"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// Dialog component removed - now using separate pages
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
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import Icon from "@/components/ui/Icon"
import { TableSkeleton, StatCardsSkeleton } from "@/components/dashboard/SkeletonLoaders"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { DataTablePagination, SortableHeader } from "@/components/ui/data-table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useTableSort } from "@/lib/hooks/useTableSort"
import { useTablePagination } from "@/lib/hooks/useTablePagination"
import { exportToCSV, exportToExcel, getExportFilename } from "@/lib/utils/export"
import type { DashboardGuiaValijaListItem } from "@/modules/guias-valija/application/dto"
import { toast } from "sonner"

// Estado mapping for better badge styling
const estadoVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  recibido: "default",
  en_transito: "default",
  entregado: "default",
  cancelado: "destructive",
}

const estadoLabels: Record<string, string> = {
  recibido: "Recibido",
  en_transito: "En Tránsito",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

interface GuiasValijaClientProps {
  initialGuias: DashboardGuiaValijaListItem[]
}

export default function GuiasValijaClient({ initialGuias }: GuiasValijaClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const urlSearchParams = useSearchParams()
  const initialSearch = urlSearchParams?.get("q") || ""
  const initialStatus = (urlSearchParams?.get("s") as "all" | "recibido" | "en_transito" | "entregado" | "cancelado" | null) || "all"
  const initialPage = Number(urlSearchParams?.get("p") || "1")
  const [guias, setGuias] = useState<DashboardGuiaValijaListItem[]>(initialGuias)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<"all" | "recibido" | "en_transito" | "entregado" | "cancelado">(initialStatus)
  const deferredSearchTerm = useDeferredValue(searchTerm)

  // Form states - Removed, now using separate pages
  const [deleteConfirm, setDeleteConfirm] = useState<DashboardGuiaValijaListItem | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const filteredGuias = useMemo(() => {
    const term = deferredSearchTerm.trim().toLowerCase()
    return guias.filter((guia) => {
      const matchesStatus = statusFilter === "all" ? true : guia.estado === statusFilter
      const matchesSearch = !term
        ? true
        : guia.numeroGuia.toLowerCase().includes(term) ||
          guia.destinatarioNombre?.toLowerCase().includes(term) ||
          guia.destinoCiudad?.toLowerCase().includes(term)
      return matchesStatus && matchesSearch
    })
  }, [deferredSearchTerm, guias, statusFilter])

  const formatShortDate = (value?: string | null) => {
    if (!value) return "-"
    return new Date(value).toLocaleDateString()
  }

  const summary = useMemo(() => {
    const total = guias.length
    const extraordinarias = guias.filter((g) => g.isExtraordinaria).length
    const entregadas = guias.filter((g) => g.estado === "entregado").length
    const enTransito = guias.filter((g) => g.estado === "en_transito").length
    return { total, extraordinarias, entregadas, enTransito }
  }, [guias])

  const statusCounts = useMemo(() => {
    return {
      all: guias.length,
      recibido: guias.filter((g) => g.estado === "recibido").length,
      en_transito: guias.filter((g) => g.estado === "en_transito").length,
      entregado: guias.filter((g) => g.estado === "entregado").length,
      cancelado: guias.filter((g) => g.estado === "cancelado").length,
    }
  }, [guias])

  // Sorting
  const { sortConfig, handleSort, sortedData, getSortIndicator, isSorted } = useTableSort(
    filteredGuias,
    { defaultSort: { key: "fechaEnvio", direction: "desc" } }
  )

  // Pagination
  const {
    currentPage,
    totalPages,
    itemsPerPage,
    paginatedData,
    goToPage,
    setItemsPerPage,
  } = useTablePagination(sortedData, { itemsPerPage: 10, initialPage: Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1 })

  useEffect(() => {
    const params = new URLSearchParams(urlSearchParams?.toString() || "")

    if (searchTerm.trim()) params.set("q", searchTerm.trim())
    else params.delete("q")

    if (statusFilter !== "all") params.set("s", statusFilter)
    else params.delete("s")

    if (currentPage > 1) params.set("p", String(currentPage))
    else params.delete("p")

    const query = params.toString()
    const target = query ? `${pathname}?${query}` : pathname
    const current = `${pathname}${urlSearchParams?.toString() ? `?${urlSearchParams.toString()}` : ""}`
    if (target !== current) {
      router.replace(target, { scroll: false })
    }
  }, [currentPage, pathname, router, searchTerm, statusFilter, urlSearchParams])

  async function fetchGuias() {
    try {
      const response = await fetch("/api/dashboard/guias-valija")
      if (!response.ok) throw new Error("Error fetching guias")
      const data = await response.json()
      setGuias(data)
    } catch (error) {
      toast.error("Error al cargar las guías")
    } finally {
      setLoading(false)
    }
  }

  function handleCreate() {
    router.push("/guias-valija/create")
  }

  function handleDelete(guia: DashboardGuiaValijaListItem) {
    setDeleteConfirm(guia)
  }

  async function confirmDelete() {
    try {
      const response = await fetch(`/api/dashboard/guias-valija/${deleteConfirm.id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Error deleting guia")

      const numeroGuia = deleteConfirm.numeroGuia

      toast.success("Guía eliminada correctamente", {
        description: `La guía ${numeroGuia} ha sido eliminada del sistema.`,
        action: {
          label: "Deshacer",
          onClick: () => {
            // TODO: Implementar función de deshacer
            toast.info("La función de deshacer estará disponible pronto")
          }
        }
      })

      setDeleteConfirm(null)
      fetchGuias()
    } catch (error) {
      toast.error("Error al eliminar la guía", {
        description: "No se pudo eliminar la guía. Inténtalo nuevamente."
      })
    }
  }

  const handleExportCSV = async () => {
    setIsExporting(true)

    // Pequeño delay para mostrar el estado de carga
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const columns = [
        { key: "numeroGuia", label: "Número" },
        { key: "tipoValija", label: "Tipo" },
        { key: "destinoCiudad", label: "Ciudad Destino" },
        { key: "destinoPais", label: "País Destino" },
        { key: "fechaEnvio", label: "Fecha Envío" },
        { key: "fechaRecibo", label: "Fecha Recibo" },
        { key: "pesoValija", label: "Peso Valija" },
        { key: "pesoOficial", label: "Peso Oficial" },
        { key: "estado", label: "Estado" },
      ]

      const filename = getExportFilename("guias_valija")

      exportToCSV(
        sortedData,
        columns,
        filename
      )

      toast.success("Datos exportados a CSV", {
        description: `${sortedData.length} guías exportadas como ${filename}.csv`
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportExcel = async () => {
    setIsExporting(true)

    // Pequeño delay para mostrar el estado de carga
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const columns = [
        { key: "numeroGuia", label: "Número" },
        { key: "tipoValija", label: "Tipo" },
        { key: "destinoCiudad", label: "Ciudad Destino" },
        { key: "destinoPais", label: "País Destino" },
        { key: "fechaEnvio", label: "Fecha Envío" },
        { key: "fechaRecibo", label: "Fecha Recibo" },
        { key: "pesoValija", label: "Peso Valija" },
        { key: "pesoOficial", label: "Peso Oficial" },
        { key: "estado", label: "Estado" },
      ]

      const filename = getExportFilename("guias_valija")

      exportToExcel(
        sortedData,
        columns,
        filename
      )

      toast.success("Datos exportados a Excel", {
        description: `${sortedData.length} guías exportadas como ${filename}.xls`
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-9 w-64 bg-[var(--kt-gray-200)] animate-pulse rounded-md" />
            <div className="h-4 w-96 bg-[var(--kt-gray-200)] animate-pulse rounded-md" />
          </div>
          <div className="h-10 w-40 bg-[var(--kt-gray-200)] animate-pulse rounded-md" />
        </div>

        {/* Search Card Skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="h-10 w-full bg-[var(--kt-gray-200)] animate-pulse rounded-md" />
          </CardContent>
        </Card>

        {/* Stats Skeleton */}
        <StatCardsSkeleton />

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-[var(--kt-gray-200)] animate-pulse rounded-md" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} />
          </CardContent>
        </Card>
      </div>
    )
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
            <BreadcrumbPage>Guías de Valija</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="rounded-xl border border-[var(--kt-gray-200)] bg-gradient-to-r from-white via-[var(--kt-primary-light)]/30 to-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--kt-text-dark)]">
              Guías de Valija
            </h1>
            <p className="text-[var(--kt-text-muted)]">
              Gestiona, filtra y exporta guías diplomáticas de entrada y salida desde un solo panel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCreate}>
              <Icon name="plus" size="sm" className="mr-2" />
              Nueva Guía
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={sortedData.length === 0 || isExporting}
            >
              <Icon name="download" size="sm" className="mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={sortedData.length === 0 || isExporting}
            >
              <Icon name="table" size="sm" className="mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Extraordinarias</CardDescription>
            <CardTitle className="text-2xl">{summary.extraordinarias}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En Tránsito</CardDescription>
            <CardTitle className="text-2xl">{summary.enTransito}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entregadas</CardDescription>
            <CardTitle className="text-2xl">{summary.entregadas}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative flex items-center gap-2">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kt-text-muted)] h-4 w-4" />
            <Input
              placeholder="Buscar por número, destinatario o ciudad..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                goToPage(1)
              }}
              className="pl-10 text-base"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  goToPage(1)
                }}
              >
                Limpiar
              </Button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={statusFilter === "all" ? "default" : "outline"}
              className={statusFilter === "all" ? "shadow-sm" : ""}
              onClick={() => { setStatusFilter("all"); goToPage(1) }}
            >
              {statusFilter === "all" && <Icon name="check" size="xs" className="mr-1" />}
              Todos ({statusCounts.all})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "recibido" ? "default" : "outline"}
              className={statusFilter === "recibido" ? "shadow-sm" : ""}
              onClick={() => { setStatusFilter("recibido"); goToPage(1) }}
            >
              {statusFilter === "recibido" && <Icon name="check" size="xs" className="mr-1" />}
              Recibido ({statusCounts.recibido})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "en_transito" ? "default" : "outline"}
              className={statusFilter === "en_transito" ? "shadow-sm" : ""}
              onClick={() => { setStatusFilter("en_transito"); goToPage(1) }}
            >
              {statusFilter === "en_transito" && <Icon name="check" size="xs" className="mr-1" />}
              En Tránsito ({statusCounts.en_transito})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "entregado" ? "default" : "outline"}
              className={statusFilter === "entregado" ? "shadow-sm" : ""}
              onClick={() => { setStatusFilter("entregado"); goToPage(1) }}
            >
              {statusFilter === "entregado" && <Icon name="check" size="xs" className="mr-1" />}
              Entregado ({statusCounts.entregado})
            </Button>
            <Button
              size="sm"
              variant={statusFilter === "cancelado" ? "destructive" : "outline"}
              className={statusFilter === "cancelado" ? "shadow-sm" : ""}
              onClick={() => { setStatusFilter("cancelado"); goToPage(1) }}
            >
              {statusFilter === "cancelado" && <Icon name="check" size="xs" className="mr-1" />}
              Cancelado ({statusCounts.cancelado})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <TooltipProvider>
          <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-xl">Guías Registradas</CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {sortedData.length} de {guias.length} guías
                </div>
                <div className="hidden gap-2 md:flex">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        disabled={sortedData.length === 0 || isExporting}
                      >
                        {isExporting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            Exportando...
                          </>
                        ) : (
                          <>
                            <Icon name="download" size="sm" className="mr-2" />
                            CSV
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Exportar a CSV (compatible con Excel)</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        disabled={sortedData.length === 0 || isExporting}
                      >
                        {isExporting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            Exportando...
                          </>
                        ) : (
                          <>
                            <Icon name="table" size="sm" className="mr-2" />
                            Excel
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Exportar a Excel (formato .xls)</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </CardHeader>
        <CardContent>
          {sortedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-6 rounded-full bg-[var(--kt-gray-100)] p-4">
                <Icon name="suitcase" size="xl" className="text-[var(--kt-text-muted)]" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                {searchTerm ? "No se encontraron resultados" : "No hay guías de valija"}
              </h3>
              <p className="text-[var(--kt-text-muted)] max-w-sm">
                {searchTerm
                  ? "No se encontraron guías que coincidan con tu búsqueda."
                  : "No hay guías registradas en el sistema."}
              </p>
            </div>
          ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:hidden">
                  {paginatedData.map((guia) => (
                    <div key={guia.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Número</p>
                          <p className="font-semibold">{guia.numeroGuia}</p>
                        </div>
                        <Badge variant={estadoVariants[guia.estado]}>
                          {estadoLabels[guia.estado] || guia.estado}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge className={guia.tipoValija === "SALIDA" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>
                          {guia.tipoValija === "SALIDA" ? "Salida" : "Entrada"}
                        </Badge>
                        {guia.isExtraordinaria && <Badge variant="outline">Extraordinaria</Badge>}
                        <Badge variant="outline">{guia.items?.length || 0} items</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Destinatario:</span> {guia.destinatarioNombre || "-"}</p>
                        <p><span className="text-muted-foreground">Ciudad:</span> {guia.destinoCiudad || "-"}</p>
                        <p><span className="text-muted-foreground">Fecha envío:</span> {formatShortDate(guia.fechaEnvio)}</p>
                      </div>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Ver guía ${guia.numeroGuia}`}
                          onClick={() => router.push(`/guias-valija/${guia.id}/view`)}
                        >
                          <Icon name="eye" size="sm" />
                        </Button>
                        {guia.filePath && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Ver archivo de ${guia.numeroGuia}`}
                            onClick={() => window.open(`/api/files/${guia.filePath}?inline=true`, "_blank")}
                          >
                            <Icon name="document" size="sm" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Editar guía ${guia.numeroGuia}`}
                          onClick={() => router.push(`/dashboard/guias-valija/${guia.id}/edit`)}
                        >
                          <Icon name="refresh" size="sm" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Eliminar guía ${guia.numeroGuia}`}
                          onClick={() => handleDelete(guia)}
                          className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                        >
                          <Icon name="trash" size="sm" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden rounded-md border md:block max-h-[65vh] overflow-auto">
                  <Table>
                  <TableCaption>
                    Lista de guías de valija registradas ({sortedData.length} registros)
                  </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 left-0 z-30 w-[120px] bg-white shadow-[2px_0_0_0_var(--kt-gray-200)]">
                      <SortableHeader
                        isSorted={isSorted("numeroGuia")}
                        sortDirection={sortConfig.key === "numeroGuia" ? sortConfig.direction : null}
                        onSort={() => handleSort("numeroGuia")}
                      >
                        Número
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-white">Tipo</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-white">
                      <SortableHeader
                        isSorted={isSorted("destinoCiudad")}
                        sortDirection={sortConfig.key === "destinoCiudad" ? sortConfig.direction : null}
                        onSort={() => handleSort("destinoCiudad")}
                      >
                        Destino
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-white">
                      <SortableHeader
                        isSorted={isSorted("fechaEnvio")}
                        sortDirection={sortConfig.key === "fechaEnvio" ? sortConfig.direction : null}
                        onSort={() => handleSort("fechaEnvio")}
                      >
                        Fecha Envío
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-white text-center">Items</TableHead>
                    <TableHead className="sticky top-0 z-20 bg-white">
                      <SortableHeader
                        isSorted={isSorted("estado")}
                        sortDirection={sortConfig.key === "estado" ? sortConfig.direction : null}
                        onSort={() => handleSort("estado")}
                      >
                        Estado
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="sticky top-0 right-0 z-30 bg-white text-right shadow-[-2px_0_0_0_var(--kt-gray-200)]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((guia) => (
                    <TableRow key={guia.id} className="group hover:bg-[var(--kt-gray-50)]">
                      <TableCell className="sticky left-0 z-10 bg-white font-medium shadow-[2px_0_0_0_var(--kt-gray-100)] group-hover:bg-[var(--kt-gray-50)]">
                        {guia.numeroGuia}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge className={guia.tipoValija === "SALIDA" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>
                            {guia.tipoValija === "SALIDA" ? "Salida" : "Entrada"}
                          </Badge>
                          {guia.isExtraordinaria && (
                            <Badge variant="outline">Extraordinaria</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {guia.destinatarioNombre || "-"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {guia.destinoCiudad || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatShortDate(guia.fechaEnvio)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {guia.items?.length || 0} items
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={estadoVariants[guia.estado]}>
                          {estadoLabels[guia.estado] || guia.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="sticky right-0 z-10 bg-white text-right shadow-[-2px_0_0_0_var(--kt-gray-100)] group-hover:bg-[var(--kt-gray-50)]">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Ver guía ${guia.numeroGuia}`}
                                onClick={() => router.push(`/guias-valija/${guia.id}/view`)}
                              >
                                <Icon name="eye" size="sm" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Ver detalles completos de la guía {guia.numeroGuia}</p>
                            </TooltipContent>
                          </Tooltip>

                          {guia.filePath && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label={`Ver archivo de ${guia.numeroGuia}`}
                                  onClick={() => window.open(`/api/files/${guia.filePath}?inline=true`, '_blank')}
                                >
                                  <Icon name="document" size="sm" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>📄 Ver Archivo PDF de la guía {guia.numeroGuia}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Editar guía ${guia.numeroGuia}`}
                                onClick={() => router.push(`/dashboard/guias-valija/${guia.id}/edit`)}
                              >
                                <Icon name="refresh" size="sm" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar información de la guía {guia.numeroGuia}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Eliminar guía ${guia.numeroGuia}`}
                                onClick={() => handleDelete(guia)}
                                className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                              >
                                <Icon name="trash" size="sm" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Eliminar guía {guia.numeroGuia} (no se puede deshacer)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <DataTablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={sortedData.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={goToPage}
                  onItemsPerPageChange={(size) => setItemsPerPage(size)}
                />
            </div>
          )}
        </CardContent>
        </TooltipProvider>
      </Card>

      {/* Form Dialog - Removed, now using separate pages */}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Guía</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la guía <strong>{deleteConfirm?.numeroGuia}</strong>?
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
