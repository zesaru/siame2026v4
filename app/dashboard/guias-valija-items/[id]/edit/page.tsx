"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface GuiaValijaItemDetail {
  id: string
  numeroItem: number
  destinatario: string
  contenido: string
  remitente: string | null
  cantidad: number | null
  peso: number | null
  guiaValija: {
    id: string
    numeroGuia: string
  }
}

export default function EditGuiaValijaItemPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [item, setItem] = useState<GuiaValijaItemDetail | null>(null)
  const [form, setForm] = useState({
    numeroItem: "",
    destinatario: "",
    contenido: "",
    remitente: "",
    cantidad: "",
    peso: "",
  })

  useEffect(() => {
    const id = params.id
    if (!id) return

    let mounted = true
    const controller = new AbortController()

    async function loadItem() {
      try {
        const response = await fetch(`/api/guias-valija-items/${id}`, {
          signal: controller.signal,
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "No se pudo cargar el item")
        }

        if (!mounted) return

        const detail = data as GuiaValijaItemDetail
        setItem(detail)
        setForm({
          numeroItem: String(detail.numeroItem ?? ""),
          destinatario: detail.destinatario ?? "",
          contenido: detail.contenido ?? "",
          remitente: detail.remitente ?? "",
          cantidad: detail.cantidad !== null && detail.cantidad !== undefined ? String(detail.cantidad) : "",
          peso: detail.peso !== null && detail.peso !== undefined ? String(detail.peso) : "",
        })
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
        toast.error(error instanceof Error ? error.message : "Error al cargar item")
        router.push("/dashboard/guias-valija-items")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadItem()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [params.id, router])

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/guias-valija-items/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroItem: form.numeroItem,
          destinatario: form.destinatario,
          contenido: form.contenido,
          remitente: form.remitente,
          cantidad: form.cantidad,
          peso: form.peso,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar")
      }

      toast.success("Item actualizado correctamente")
      router.push("/dashboard/guias-valija-items")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="mx-auto mt-6 max-w-4xl">
        <CardContent className="py-10">
          <LoadingSpinner message="Cargando item..." />
        </CardContent>
      </Card>
    )
  }

  if (!item) {
    return (
      <Card className="mx-auto mt-6 max-w-4xl">
        <CardContent className="py-10 text-center text-sm text-[var(--kt-text-muted)]">
          Item no encontrado
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Panel</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/guias-valija-items">Items de Valija</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Editar Item #{item.numeroItem}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="sticky top-3 z-20 flex flex-col gap-3 rounded-xl border border-[var(--kt-gray-200)] bg-white/95 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--kt-text-dark)]">
            Editar Item #{item.numeroItem}
          </h1>
          <p className="text-sm text-[var(--kt-text-muted)]">
            Guía relacionada: <span className="font-medium">{item.guiaValija.numeroGuia}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/guias-valija-items")}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del Item</CardTitle>
          <CardDescription>
            Guía relacionada: <span className="font-medium">{item.guiaValija.numeroGuia}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="numeroItem">N° VAL-ITEM</Label>
              <Input
                id="numeroItem"
                type="number"
                min={1}
                value={form.numeroItem}
                onChange={(e) => updateField("numeroItem", e.target.value)}
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
            <Label htmlFor="contenido">Contenido</Label>
            <Textarea
              id="contenido"
              rows={4}
              value={form.contenido}
              onChange={(e) => updateField("contenido", e.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="remitente">Remitente</Label>
              <Input
                id="remitente"
                value={form.remitente}
                onChange={(e) => updateField("remitente", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                min={0}
                value={form.cantidad}
                onChange={(e) => updateField("cantidad", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="peso">Peso (kg)</Label>
              <Input
                id="peso"
                type="number"
                min={0}
                step="0.001"
                value={form.peso}
                onChange={(e) => updateField("peso", e.target.value)}
              />
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
