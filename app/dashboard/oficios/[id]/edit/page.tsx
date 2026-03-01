"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { withTrackView } from "@/lib/utils"
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

interface OficioDetail {
  id: string
  numeroOficio: string
  asunto: string | null
  remitente: string | null
  destinatario: string | null
  referencia: string | null
}

export default function EditOficioPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [form, setForm] = useState({
    numeroOficio: "",
    asunto: "",
    remitente: "",
    destinatario: "",
    referencia: "",
  })

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(withTrackView(`/api/oficios/${params.id}`, false))
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "No se pudo cargar el oficio")
        }
        const oficio = data as OficioDetail
        setForm({
          numeroOficio: oficio.numeroOficio || "",
          asunto: oficio.asunto || "",
          remitente: oficio.remitente || "",
          destinatario: oficio.destinatario || "",
          referencia: oficio.referencia || "",
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error al cargar oficio")
        router.push("/dashboard/oficios")
      } finally {
        setLoading(false)
      }
    }
    if (params.id) load()
  }, [params.id, router])

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/oficios/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar el oficio")
      }
      toast.success("Oficio actualizado")
      router.push(`/dashboard/oficios/${params.id}/view`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const response = await fetch(`/api/oficios/${params.id}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "No se pudo eliminar el oficio")
      }
      toast.success("Oficio eliminado")
      setDeleteDialogOpen(false)
      router.push("/dashboard/oficios")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-[var(--kt-text-muted)]">Cargando oficio...</div>
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Editar Oficio</CardTitle>
          <CardDescription>Actualiza los campos principales del oficio confirmado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="numeroOficio">Nº Oficio</Label>
            <Input
              id="numeroOficio"
              value={form.numeroOficio}
              onChange={(e) => updateField("numeroOficio", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="asunto">Asunto</Label>
            <Textarea
              id="asunto"
              rows={3}
              value={form.asunto}
              onChange={(e) => updateField("asunto", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="remitente">Remitente</Label>
              <Input
                id="remitente"
                value={form.remitente}
                onChange={(e) => updateField("remitente", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destinatario">Destinatario</Label>
              <Input
                id="destinatario"
                value={form.destinatario}
                onChange={(e) => updateField("destinatario", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referencia">Referencia</Label>
            <Input
              id="referencia"
              value={form.referencia}
              onChange={(e) => updateField("referencia", e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || deleting}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/dashboard/oficios/${params.id}/view`)} disabled={saving || deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={saving || deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar oficio</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el oficio permanentemente. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Confirmar eliminación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
