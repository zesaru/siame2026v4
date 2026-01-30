"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import GuiaValijaForm from "@/components/dashboard/GuiaValijaForm"
import GuiaValijaEditableForm from "@/components/dashboard/GuiaValijaEditableForm"
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
import { toast } from "sonner"

// Estado colors for custom styling
const estadoColors: Record<string, string> = {
  pendiente: "bg-gray-100 text-gray-700",
  en_transito: "bg-blue-100 text-blue-700",
  entregado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
}

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
  session: any
  initialGuias: any[]
}

export default function GuiasValijaClient({ session, initialGuias }: GuiasValijaClientProps) {
  const router = useRouter()
  const [guias, setGuias] = useState<any[]>(initialGuias)
  const [filteredGuias, setFilteredGuias] = useState<any[]>(initialGuias)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Form states - Removed, now using separate pages
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Ya no necesitamos fetch inicial porque viene como prop

  useEffect(() => {
    if (searchTerm) {
      const filtered = guias.filter((guia) =>
        guia.numeroGuia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guia.destinatarioNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guia.destinoCiudad?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredGuias(filtered)
    } else {
      setFilteredGuias(guias)
    }
  }, [searchTerm, guias])

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
  } = useTablePagination(sortedData, { itemsPerPage: 10 })

  async function fetchGuias() {
    try {
      const response = await fetch("/api/dashboard/guias-valija")
      if (!response.ok) throw new Error("Error fetching guias")
      const data = await response.json()
      setGuias(data)
      setFilteredGuias(data)
    } catch (error) {
      toast.error("Error al cargar las guías")
    } finally {
      setLoading(false)
    }
  }

  function handleCreate() {
    router.push("/guias-valija/create")
  }

  function handleDelete(guia: any) {
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

  function handleFormSuccess() {
    fetchGuias()
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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--kt-text-dark)]">
          Guías de Valija
        </h1>
        <p className="text-[var(--kt-text-muted)]">
          Gestiona tus documentos diplomáticos y de valija
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kt-text-muted)] h-4 w-4" />
            <Input
              placeholder="Buscar por número, destinatario o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <TooltipProvider>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Guías Registradas</CardTitle>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  {sortedData.length} de {guias.length} guías
                </div>
                <div className="flex gap-2">
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
              <div className="rounded-md border">
                <Table>
                  <TableCaption>
                    Lista de guías de valija registradas ({sortedData.length} registros)
                  </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">
                      <SortableHeader
                        isSorted={isSorted("numeroGuia")}
                        sortDirection={sortConfig.key === "numeroGuia" ? sortConfig.direction : null}
                        onSort={() => handleSort("numeroGuia")}
                      >
                        Número
                      </SortableHeader>
                    </TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>
                      <SortableHeader
                        isSorted={isSorted("destinoCiudad")}
                        sortDirection={sortConfig.key === "destinoCiudad" ? sortConfig.direction : null}
                        onSort={() => handleSort("destinoCiudad")}
                      >
                        Destino
                      </SortableHeader>
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        isSorted={isSorted("fechaEnvio")}
                        sortDirection={sortConfig.key === "fechaEnvio" ? sortConfig.direction : null}
                        onSort={() => handleSort("fechaEnvio")}
                      >
                        Fecha Envío
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead>
                      <SortableHeader
                        isSorted={isSorted("estado")}
                        sortDirection={sortConfig.key === "estado" ? sortConfig.direction : null}
                        onSort={() => handleSort("estado")}
                      >
                        Estado
                      </SortableHeader>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((guia) => (
                    <TableRow key={guia.id}>
                      <TableCell className="font-medium">
                        {guia.numeroGuia}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700">
                          GUÍA DE VALIJA {guia.numeroGuia?.split('-')[0]?.replace('EXT', '')} ENTRADA{guia.isExtraordinaria && ' EXTRAORDINARIA'}
                        </Badge>
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
                        {guia.fechaEnvio
                          ? new Date(guia.fechaEnvio).toLocaleDateString()
                          : "-"}
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/guias-valija/${guia.id}/view`, '_blank')}
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
