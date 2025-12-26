"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import Icon from "@/components/ui/Icon"
import GuiaValijaForm from "@/components/dashboard/GuiaValijaForm"
import { toast } from "sonner"

const tipoValijaColors: Record<string, string> = {
  ENTRADA: "bg-[var(--kt-info-light)] text-[var(--kt-info)]",
  SALIDA: "bg-[var(--kt-warning-light)] text-[var(--kt-warning)]",
}

const estadoColors: Record<string, string> = {
  pendiente: "bg-[var(--kt-gray-200)] text-[var(--kt-gray-700)]",
  en_transito: "bg-blue-100 text-blue-700",
  entregado: "bg-[var(--kt-success-light)] text-[var(--kt-success)]",
  cancelado: "bg-[var(--kt-danger-light)] text-[var(--kt-danger)]",
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

  // Modal states
  const [showForm, setShowForm] = useState(false)
  const [editingGuia, setEditingGuia] = useState<any>(null)
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
    setEditingGuia(null)
    setShowForm(true)
  }

  function handleEdit(guia: any) {
    setEditingGuia(guia)
    setShowForm(true)
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
    setShowForm(false)
    setEditingGuia(null)
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
        <div>
          <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">
            Guías de Valija
          </h1>
          <p className="text-[var(--kt-text-muted)] mt-1">
            Gestiona tus documentos diplomáticos ({guias.length} registros)
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)]">
          <Icon name="plus" size="sm" className="mr-2" />
          Nueva Guía
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--kt-text-muted)]" />
            <Input
              placeholder="Buscar por número, destinatario o ciudad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Guías Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredGuias.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="suitcase" size="xl" className="mx-auto text-[var(--kt-text-muted)] mb-4" />
              <p className="text-[var(--kt-text-muted)]">
                {searchTerm ? "No se encontraron resultados" : "No hay guías de valija registradas"}
              </p>
              {!searchTerm && (
                <Button onClick={handleCreate} variant="outline" className="mt-4">
                  <Icon name="plus" size="sm" className="mr-2" />
                  Crear Primera Guía
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--kt-gray-200)]">
                <thead className="bg-[var(--kt-gray-50)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Destino
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Fecha Envío
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[var(--kt-gray-200)]">
                  {filteredGuias.map((guia) => (
                    <tr key={guia.id} className="hover:bg-[var(--kt-gray-50)]">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-[var(--kt-text-dark)]">
                          {guia.numeroGuia}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${tipoValijaColors[guia.tipoValija]}`}>
                          {guia.tipoValija}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-[var(--kt-text-dark)]">
                            {guia.destinatarioNombre || "-"}
                          </p>
                          <p className="text-xs text-[var(--kt-text-muted)]">
                            {guia.destinoCiudad || "-"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {guia.fechaEnvio
                            ? new Date(guia.fechaEnvio).toLocaleDateString()
                            : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {guia.items?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${estadoColors[guia.estado]}`}>
                          {estadoLabels[guia.estado] || guia.estado}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(guia)}
                            title="Editar"
                          >
                            <Icon name="search" size="sm" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(guia)}
                            title="Editar"
                            className="text-[var(--kt-info)] hover:text-[var(--kt-info)]"
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGuia ? "Editar Guía de Valija" : "Nueva Guía de Valija"}
            </DialogTitle>
            <DialogDescription>
              {editingGuia ? "Actualiza la información de la guía" : "Completa el formulario para crear una nueva guía"}
            </DialogDescription>
          </DialogHeader>
          <GuiaValijaForm
            guia={editingGuia}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

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
