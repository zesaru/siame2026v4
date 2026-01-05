"use client"

import { useState, useMemo } from "react"
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Icon from "@/components/ui/Icon"
import { toast } from "sonner"
import type { HojaRemision } from "@prisma/client"

interface HojasRemisionClientProps {
  initialHojas: HojaRemision[]
}

function getEstadoColor(estado: string) {
  switch (estado.toLowerCase()) {
    case "borrador":
      return "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]"
    case "enviada":
      return "bg-blue-100 text-blue-700"
    case "recibida":
      return "bg-[var(--kt-success-light)] text-[var(--kt-success)]"
    case "anulada":
      return "bg-[var(--kt-danger-light)] text-[var(--kt-danger)]"
    default:
      return "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]"
  }
}

export default function HojasRemisionClient({
  initialHojas,
}: HojasRemisionClientProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState<string>("all")
  const [deleteConfirm, setDeleteConfirm] = useState<HojaRemision | null>(null)
  const [hojas, setHojas] = useState<HojaRemision[]>(initialHojas)

  // Extraer años únicos de las hojas
  const availableYears = useMemo(() => {
    const years = new Set<number>()
    hojas.forEach((hoja) => {
      years.add(new Date(hoja.fecha).getFullYear())
    })
    return Array.from(years).sort((a, b) => b - a) // Descendente
  }, [hojas])

  // Filtrar hojas basado en búsqueda y año
  const filteredHojas = useMemo(() => {
    return hojas.filter((hoja) => {
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

  const handleDelete = (hoja: HojaRemision) => {
    setDeleteConfirm(hoja)
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      const response = await fetch(`/api/hojas-remision/${deleteConfirm.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Error al eliminar la hoja de remisión")

      toast.success("Hoja de Remisión eliminada correctamente")
      setDeleteConfirm(null)

      // Actualizar la lista localmente
      setHojas(hojas.filter((h) => h.id !== deleteConfirm.id))
    } catch (error) {
      toast.error("Error al eliminar la hoja de remisión")
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">
            Hojas de Remisión
          </h1>
          <p className="text-[var(--kt-text-muted)] mt-1">
            Gestiona tus documentos diplomáticos
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/hojas-remision/new")}
          className="bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)]"
        >
          Subir Hoja de Remisión
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                type="text"
                placeholder="Número, para, remitente, asunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <p className="text-xs text-[var(--kt-text-muted)] mt-1">
                Busca por número completo, destinatario, remitente o asunto
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
              <p className="text-xs text-[var(--kt-text-muted)] mt-1">
                Filtra por año de la hoja de remisión
              </p>
            </div>
          </div>

          {(searchTerm || yearFilter !== "all") && (
            <div className="mt-4 pt-4 border-t border-[var(--kt-gray-200)]">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--kt-text-muted)]">
                  Mostrando {filteredHojas.length} de {hojas.length} hojas
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Hojas Registradas ({filteredHojas.length})
            {filteredHojas.length !== hojas.length && (
              <span className="text-sm font-normal text-[var(--kt-text-muted)] ml-2">
                (filtrado de {hojas.length} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHojas.length === 0 ? (
            <div className="text-center py-12">
              {hojas.length === 0 ? (
                <p className="text-[var(--kt-text-muted)]">
                  No hay hojas de remisión registradas
                </p>
              ) : (
                <div>
                  <p className="text-[var(--kt-text-muted)] mb-2">
                    No se encontraron hojas que coincidan con los filtros
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
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--kt-gray-200)]">
                <thead className="bg-[var(--kt-gray-50)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Número Completo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Unidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Para
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Asunto
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
                  {filteredHojas.map((hoja) => (
                    <tr key={hoja.id} className="hover:bg-[var(--kt-gray-50)]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-[var(--kt-text-dark)]">
                          {hoja.numeroCompleto}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {hoja.siglaUnidad}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-dark)]">
                          {hoja.para}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {new Date(hoja.fecha).toLocaleDateString('es-PE')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {hoja.asunto.length > 50
                            ? hoja.asunto.substring(0, 50) + "..."
                            : hoja.asunto}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getEstadoColor(hoja.estado)}>
                          {hoja.estado}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/hojas-remision/edit/${hoja.id}`)}
                            title="Subir PDF y editar"
                            className="text-[var(--kt-info)] hover:text-[var(--kt-info)]"
                          >
                            <Icon name="upload" size="sm" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/hojas-remision/${hoja.id}/view`)}
                            title="Ver detalles"
                          >
                            <Icon name="eye" size="sm" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(hoja)}
                            title="Eliminar"
                            className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                          >
                            <Icon name="trash" size="sm" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Hoja de Remisión</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la hoja de remisión <strong>{deleteConfirm?.numeroCompleto}</strong>?
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
