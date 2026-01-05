"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import GuiaValijaEditableForm from "@/components/dashboard/GuiaValijaEditableForm"
import { toast } from "sonner"

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
    const id = params.id as string
    if (!id) {
      toast.error("ID de guía no especificado")
      router.push("/dashboard/guias-valija")
      return
    }

    fetchGuia(id)
  }, [params.id])

  async function fetchGuia(id: string) {
    try {
      const response = await fetch(`/api/dashboard/guias-valija/${id}`)
      if (!response.ok) throw new Error("Error al cargar la guía")

      const data = await response.json()
      setGuia(data)
    } catch (error) {
      toast.error("Error al cargar la guía")
      router.push("/dashboard/guias-valija")
    } finally {
      setLoading(false)
    }
  }

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
      <GuiaValijaEditableForm
        guia={guia}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}