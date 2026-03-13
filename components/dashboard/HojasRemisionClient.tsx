"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/EmptyState"
import Icon from "@/components/ui/Icon"
import { DataTablePagination, SortableHeader } from "@/components/ui/data-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import type { HojaRemision, Role } from "@prisma/client"
import { HOJA_REMISION_STATUS, normalizeHojaRemisionEstado } from "@/lib/hoja-remision-status"

interface HojasRemisionClientProps {
  initialHojas: HojaRemision[]
  currentUserRole: Role
}

function getEstadoColor(estado: string) {
  switch (normalizeHojaRemisionEstado(estado)) {
    case HOJA_REMISION_STATUS.PENDING_REVIEW:
      return "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]"
    case HOJA_REMISION_STATUS.REVIEWED:
      return "bg-[var(--kt-success-light)] text-[var(--kt-success)]"
    default:
      return "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]"
  }
}

function truncateText(value: string, max: number) {
  return value.length > max ? `${value.substring(0, max)}...` : value
}

export default function HojasRemisionClient({
  initialHojas,
  currentUserRole,
}: HojasRemisionClientProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [deleteConfirm, setDeleteConfirm] = useState<HojaRemision | null>(null)
  const [editChoice, setEditChoice] = useState<HojaRemision | null>(null)
  const [hojas, setHojas] = useState<HojaRemision[]>(initialHojas)
  const [sorting, setSorting] = useState<SortingState>([{ id: "fecha", desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const canDelete = currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN"

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    hojas.forEach((hoja) => {
      years.add(new Date(hoja.fecha).getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a)
  }, [hojas])

  const filteredHojas = useMemo(() => {
    return hojas
      .filter((hoja) => {
        const matchesSearch =
          searchTerm === "" ||
          hoja.numeroCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
          hoja.para.toLowerCase().includes(searchTerm.toLowerCase()) ||
          hoja.remitente.toLowerCase().includes(searchTerm.toLowerCase()) ||
          hoja.asunto.toLowerCase().includes(searchTerm.toLowerCase())

        const hojaYear = new Date(hoja.fecha).getFullYear()
        const matchesYear = yearFilter === "all" || hojaYear.toString() === yearFilter

        return matchesSearch && matchesYear
      })
  }, [hojas, searchTerm, yearFilter])

  const stats = useMemo(() => {
    const withPdf = hojas.filter((hoja) => Boolean(hoja.filePath)).length
    const pendingReview = hojas.filter(
      (hoja) => normalizeHojaRemisionEstado(hoja.estado) === HOJA_REMISION_STATUS.PENDING_REVIEW
    ).length
    const currentYear = new Date().getFullYear()
    const currentYearCount = hojas.filter((hoja) => new Date(hoja.fecha).getFullYear() === currentYear).length

    return {
      total: hojas.length,
      withPdf,
      pendingReview,
      currentYearCount,
    }
  }, [hojas])

  const hojasWithoutPdf = useMemo(
    () => hojas.filter((hoja) => !hoja.filePath).sort((a, b) => a.numeroCompleto.localeCompare(b.numeroCompleto)),
    [hojas]
  )

  const handleDelete = (hoja: HojaRemision) => {
    setDeleteConfirm(hoja)
  }

  const handleEdit = (hoja: HojaRemision) => {
    setEditChoice(hoja)
  }

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }, [searchTerm, yearFilter])

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      const response = await fetch(`/api/hojas-remision/${deleteConfirm.id}`, {
        method: "DELETE",
      })

      if (response.status === 404) {
        toast.info("La hoja de remisión ya no estaba disponible.")
        setDeleteConfirm(null)
        setHojas((current) => current.filter((h) => h.id !== deleteConfirm.id))
        router.refresh()
        return
      }

      if (!response.ok) throw new Error("Error al eliminar la hoja de remisión")

      toast.success("Hoja de remisión eliminada correctamente")
      setDeleteConfirm(null)
      setHojas((current) => current.filter((h) => h.id !== deleteConfirm.id))
      router.refresh()
    } catch {
      toast.error("Error al eliminar la hoja de remisión")
    }
  }

  const columns = useMemo<ColumnDef<HojaRemision>[]>(
    () => [
      {
        accessorKey: "numeroCompleto",
        header: ({ column }) => (
          <SortableHeader
            isSorted={column.getIsSorted() !== false}
            sortDirection={column.getIsSorted() === "asc" ? "asc" : column.getIsSorted() === "desc" ? "desc" : null}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Nro. H.R:
          </SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--kt-text-dark)]">{row.original.numeroCompleto}</p>
          </div>
        ),
      },
      {
        accessorKey: "remitente",
        header: ({ column }) => (
          <SortableHeader
            isSorted={column.getIsSorted() !== false}
            sortDirection={column.getIsSorted() === "asc" ? "asc" : column.getIsSorted() === "desc" ? "desc" : null}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Remitente
          </SortableHeader>
        ),
        cell: ({ row }) => <p className="text-sm text-[var(--kt-text-dark)]">{row.original.siglaUnidad || "-"}</p>,
      },
      {
        accessorKey: "fecha",
        sortingFn: "datetime",
        header: ({ column }) => (
          <SortableHeader
            isSorted={column.getIsSorted() !== false}
            sortDirection={column.getIsSorted() === "asc" ? "asc" : column.getIsSorted() === "desc" ? "desc" : null}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Fecha
          </SortableHeader>
        ),
        cell: ({ row }) => (
          <div className="space-y-2 text-sm">
            <p className="text-[var(--kt-text-dark)]">{new Date(row.original.fecha).toLocaleDateString("es-PE")}</p>
            {row.original.filePath ? (
              <a
                href={`/api/hojas-remision/file/${row.original.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[var(--kt-primary)] hover:text-[var(--kt-primary-dark)]"
                title="Abrir PDF"
              >
                <Icon name="file-text" size="sm" />
                <span>Ver PDF</span>
              </a>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "asunto",
        header: ({ column }) => (
          <SortableHeader
            isSorted={column.getIsSorted() !== false}
            sortDirection={column.getIsSorted() === "asc" ? "asc" : column.getIsSorted() === "desc" ? "desc" : null}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Asunto
          </SortableHeader>
        ),
        cell: ({ row }) => <span className="text-sm text-[var(--kt-text-muted)]">{truncateText(row.original.asunto, 88)}</span>,
      },
      {
        accessorKey: "estado",
        header: ({ column }) => (
          <SortableHeader
            isSorted={column.getIsSorted() !== false}
            sortDirection={column.getIsSorted() === "asc" ? "asc" : column.getIsSorted() === "desc" ? "desc" : null}
            onSort={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Estado
          </SortableHeader>
        ),
        cell: ({ row }) => (
          <Badge className={getEstadoColor(row.original.estado)}>
            {normalizeHojaRemisionEstado(row.original.estado)}
          </Badge>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <div className="text-right">Acciones</div>,
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/hojas-remision/${row.original.id}/view`)}
              title="Consultar HR"
              className="gap-2"
            >
              <Icon name="eye" size="sm" />
              <span>Ver</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(row.original)}
              title="Editar datos o reemplazar PDF"
              className="gap-2 border-[var(--kt-info)]/25 text-[var(--kt-info)] hover:text-[var(--kt-info)]"
            >
              <Icon name="edit" size="sm" />
              <span>Editar</span>
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(row.original)}
                title="Eliminar HR"
                className="gap-2 text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
              >
                <Icon name="trash" size="sm" />
                <span>Eliminar</span>
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canDelete, router]
  )

  const table = useReactTable({
    data: filteredHojas,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Panel</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Hojas de Remisión</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card className="overflow-hidden border-[var(--kt-gray-200)] bg-[radial-gradient(circle_at_top_left,rgba(54,153,255,0.16),transparent_28%),linear-gradient(135deg,#ffffff_0%,#f6faff_52%,#eef5ff_100%)] shadow-[0_20px_55px_-30px_rgba(54,153,255,0.4)]">
        <CardContent className="p-6">
          <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--kt-primary)]">Mesa HR</p>
                <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--kt-text-dark)]">Hojas de Remisión</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--kt-text-muted)]">
                  Desde aquí revisas hojas existentes y, cuando hace falta, reemplazas su soporte PDF desde el flujo de edición.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Total HR</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--kt-text-dark)]">{stats.total}</p>
                    <p className="mt-1 text-xs text-[var(--kt-text-muted)]">registros disponibles en la mesa</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Con PDF</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--kt-text-dark)]">{stats.withPdf}</p>
                    <p className="mt-1 text-xs text-[var(--kt-text-muted)]">soportes documentales asociados</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--kt-text-muted)]">Sin revisar</p>
                    <p className="mt-3 text-3xl font-semibold text-[var(--kt-text-dark)]">{stats.pendingReview}</p>
                    <p className="mt-1 text-xs text-[var(--kt-text-muted)]">pendientes de validación final</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--kt-warning)]/30 bg-[linear-gradient(180deg,var(--kt-warning-light),rgba(255,255,255,0.96))] p-4">
                  {hojasWithoutPdf.length > 0 ? (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-white/90 p-2 text-[var(--kt-warning)] shadow-sm">
                        <Icon name="alert-triangle" size="sm" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[var(--kt-text-dark)]">
                          {hojasWithoutPdf.length} registro{hojasWithoutPdf.length === 1 ? "" : "s"} sin PDF
                        </p>
                        <div className="text-sm text-[var(--kt-text-muted)]">
                          <span className="font-medium text-[var(--kt-text-dark)]">Hojas pendientes:</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {hojasWithoutPdf.map((hoja) => (
                              <Badge
                                key={hoja.id}
                                variant="outline"
                                className="border-[var(--kt-warning)]/30 bg-white/85 text-[var(--kt-text-dark)]"
                              >
                                {hoja.numeroCompleto}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-white/90 p-2 text-[var(--kt-success)] shadow-sm">
                        <Icon name="check-circle" size="sm" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-[var(--kt-text-dark)]">Todos los registros tienen PDF</p>
                        <p className="text-sm text-[var(--kt-text-muted)]">
                          No hay hojas de remisión pendientes de soporte documental.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--kt-gray-200)]">
        <CardHeader>
          <CardTitle>Filtros de búsqueda</CardTitle>
          <CardDescription>Busca por número, destinatario, remitente o asunto y reduce la mesa por año.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                type="text"
                placeholder="Número, para, remitente, asunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <p className="mt-1 text-xs text-[var(--kt-text-muted)]">
                Encuentra rápido una HR para verla, corregirla o reemplazar su soporte.
              </p>
            </div>

            <div>
              <Label htmlFor="year">Año</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger id="year" suppressHydrationWarning>
                  <SelectValue placeholder="Todos los años" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-[var(--kt-text-muted)]">
                {stats.currentYearCount} HR corresponden al año actual.
              </p>
            </div>
          </div>

          {(searchTerm || yearFilter !== "all") && (
            <div className="mt-4 border-t border-[var(--kt-gray-200)] pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--kt-text-muted)]">
                  Mostrando {sortedData.length} de {hojas.length} hojas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("")
                    setYearFilter("all")
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--kt-gray-200)]">
        <CardContent>
          {filteredHojas.length === 0 ? (
            <EmptyState
              title={hojas.length === 0 ? "Sin hojas registradas" : "Sin resultados"}
              message={
                hojas.length === 0
                  ? "Todavía no hay hojas de remisión registradas."
                  : "No se encontraron hojas que coincidan con los filtros actuales."
              }
              action={
                hojas.length === 0 ? undefined : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("")
                      setYearFilter("all")
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )
              }
              className="py-4"
            />
          ) : (
            <>
              <div className="rounded-md border max-h-[65vh] overflow-auto">
                <Table>
                  <caption className="caption-bottom px-4 py-3 text-sm text-[var(--kt-text-muted)]">
                    Lista de hojas de remisión registradas ({filteredHojas.length} registros)
                  </caption>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className={`px-6 py-3 text-xs uppercase tracking-wider text-[var(--kt-text-muted)] ${
                              header.column.id === "numeroCompleto"
                                ? "sticky left-0 top-0 z-30 w-[180px] bg-white shadow-[2px_0_0_0_var(--kt-gray-200)]"
                                : header.column.id === "actions"
                                ? "sticky right-0 top-0 z-30 bg-white text-right shadow-[-2px_0_0_0_var(--kt-gray-200)]"
                                : "sticky top-0 z-20 bg-white"
                            }`}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="group align-top transition-colors duration-200 hover:bg-[var(--kt-gray-50)]">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={`px-6 py-4 ${
                              cell.column.id === "numeroCompleto"
                                ? "sticky left-0 z-10 bg-white font-medium shadow-[2px_0_0_0_var(--kt-gray-100)] group-hover:bg-[var(--kt-gray-50)]"
                                : cell.column.id === "actions"
                                ? "sticky right-0 z-10 bg-white text-right shadow-[-2px_0_0_0_var(--kt-gray-100)] group-hover:bg-[var(--kt-gray-50)]"
                                : ""
                            } ${cell.column.id === "estado" ? "whitespace-nowrap" : ""} ${
                              cell.column.id === "actions" ? "text-right" : ""
                            }`}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination
                currentPage={table.getState().pagination.pageIndex + 1}
                totalPages={table.getPageCount()}
                totalItems={filteredHojas.length}
                itemsPerPage={table.getState().pagination.pageSize}
                onPageChange={(page) => table.setPageIndex(Math.max(0, page - 1))}
                onItemsPerPageChange={(itemsPerPage) => table.setPageSize(itemsPerPage)}
              />
            </>
          )}
        </CardContent>
      </Card>

      {canDelete && (
        <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Hoja de Remisión</AlertDialogTitle>
              <AlertDialogDescription>
                Estás por eliminar la hoja de remisión <strong>{deleteConfirm?.numeroCompleto}</strong>. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-[var(--kt-danger)] hover:bg-[var(--kt-danger-dark)]">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={!!editChoice} onOpenChange={() => setEditChoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cómo quieres editar esta hoja?</AlertDialogTitle>
            <AlertDialogDescription>
              Puedes abrir el formulario para corregir campos o subir un PDF nuevo para analizarlo antes de guardar
              {editChoice ? ` en ${editChoice.numeroCompleto}` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (!editChoice) return
                router.push(`/dashboard/hojas-remision/edit/${editChoice.id}`)
                setEditChoice(null)
              }}
            >
              Editar campos
            </Button>
            <AlertDialogAction
              onClick={() => {
                if (!editChoice) return
                router.push(`/dashboard/hojas-remision/edit/${editChoice.id}?intent=upload`)
                setEditChoice(null)
              }}
            >
              Subir archivo y analizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
