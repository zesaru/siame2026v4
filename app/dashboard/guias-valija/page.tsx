"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
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
  pendiente: "secondary",
  en_transito: "default",
  entregado: "default",
  cancelado: "destructive",
}

const estadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_transito: "En Tránsito",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

export default function GuiasValijaPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [guias, setGuias] = useState<any[]>([])
  const [filteredGuias, setFilteredGuias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Form states - Removed, now using separate pages
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/auth/signin")
      return
    }
    fetchGuias()
  }, [session, status])

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
      toast.success("Guía eliminada correctamente")
      setDeleteConfirm(null)
      fetchGuias()
    } catch (error) {
      toast.error("Error al eliminar la guía")
    }
  }

  function handleFormSuccess() {
    fetchGuias()
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--kt-text-muted)]">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--kt-text-dark)]">
            Guías de Valija
          </h1>
          <p className="text-[var(--kt-text-muted)]">
            Gestiona tus documentos diplomáticos y de valija
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)] shadow-sm"
          size="lg"
        >
          <Icon name="plus" size="sm" className="mr-2" />
          Nueva Guía
        </Button>
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Guías Registradas</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filteredGuias.length} de {guias.length} guías
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGuias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-6 rounded-full bg-[var(--kt-gray-100)] p-4">
                <Icon name="suitcase" size="xl" className="text-[var(--kt-text-muted)]" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                {searchTerm ? "No se encontraron resultados" : "No hay guías de valija"}
              </h3>
              <p className="mb-6 text-[var(--kt-text-muted)] max-w-sm">
                {searchTerm
                  ? "No se encontraron guías que coincidan con tu búsqueda."
                  : "Comienza creando tu primera guía de valija para gestionar tus documentos diplomáticos."}
              </p>
              {!searchTerm && (
                <Button
                  onClick={handleCreate}
                  className="bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)]"
                >
                  <Icon name="plus" size="sm" className="mr-2" />
                  Crear Primera Guía
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableCaption>
                  Lista de guías de valija registradas ({filteredGuias.length} registros)
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Fecha Envío</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuias.map((guia) => (
                    <TableRow key={guia.id}>
                      <TableCell className="font-medium">
                        {guia.numeroGuia}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700">
                          Entrada
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/guias-valija/${guia.id}/view`, '_blank')}
                            title="Ver Detalles"
                          >
                            <Icon name="eye" size="sm" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/guias-valija/${guia.id}/edit`)}
                            title="Editar"
                          >
                            <Icon name="refresh" size="sm" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(guia)}
                            title="Eliminar"
                            className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                          >
                            <Icon name="trash" size="sm" />
                          </Button>
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
