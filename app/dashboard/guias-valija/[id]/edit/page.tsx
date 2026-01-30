"use client"

import { useEffect, useState, lazy, Suspense } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { toast } from "sonner"

// Lazy load heavy component (668 lines)
const GuiaValijaEditableForm = lazy(() => import("@/components/dashboard/GuiaValijaEditableForm"))

interface GuiaValijaDetails {
  id: string
  numeroGuia: string
  tipoValija: string
  estado: string
  fechaEmision: string
  fechaEnvio?: string
  fechaRecibo?: string
  pesoValija?: number
  pesoOficial?: number
  numeroPaquetes?: number
  remitenteNombre?: string
  remitenteCargo?: string
  remitenteEmail?: string
  destinatarioNombre?: string
  destinatarioCargo?: string
  destinatarioEmail?: string
  origenCiudad?: string
  origenPais?: string
  destinoCiudad?: string
  destinoPais?: string
  descripcionContenido?: string
  observaciones?: string
  items: GuiaValijaItem[]
  createdAt: string
}

interface GuiaValijaItem {
  id: string
  numeroItem: number
  destinatario: string
  contenido: string
  remitente?: string
  cantidad?: number
  peso?: number
}

export default function EditGuiaValijaPage() {
  const router = useRouter()
  const params = useParams()
  const [guia, setGuia] = useState<GuiaValijaDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const abortController = new AbortController()
    let mounted = true

    const id = params.id as string
    if (!id) {
      toast.error("ID de guía no especificado")
      router.push("/dashboard/guias-valija")
      return
    }

    async function fetchGuia(id: string) {
      if (!mounted) return

      try {
        const response = await fetch(`/api/dashboard/guias-valija/${id}`, {
          signal: abortController.signal
        })
        if (!response.ok) throw new Error("Error al cargar la guía")

        const data = await response.json()

        if (mounted) {
          setGuia(data)
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          toast.error("Error al cargar la guía")
          router.push("/dashboard/guias-valija")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchGuia(id)

    return () => {
      mounted = false
      abortController.abort()
    }
  }, [params.id, router])

  const handleSuccess = () => {
    toast.success("Guía actualizada correctamente")
    router.push("/dashboard/guias-valija")
  }

  const handleCancel = () => {
    router.push("/dashboard/guias-valija")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--kt-text-muted)]">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!guia) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-[var(--kt-text-muted)]">Guía no encontrada</p>
          <button
            onClick={() => router.push("/dashboard/guias-valija")}
            className="mt-4 text-[var(--kt-primary)] hover:underline"
          >
            Volver al listado
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/guias-valija">Guías de Valija</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Editar: {guia.numeroGuia}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Suspense fallback={
        <div className="flex items-center justify-center h-64 text-[var(--kt-text-muted)]">
          Cargando formulario de edición...
        </div>
      }>
        <GuiaValijaEditableForm
          guia={guia}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </Suspense>
    </div>
  )
}