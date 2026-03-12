"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { toast } from "sonner"
import HojaRemisionEditor from "@/components/dashboard/HojaRemisionEditor"
import type { HojaRemisionFormData } from "@/components/dashboard/HojaRemisionForm"
import { getHojaRemision, updateHojaRemision } from "@/app/dashboard/hojas-remision/actions"

interface EditableHojaRemision extends Partial<HojaRemisionFormData> {
  id: string
  filePath?: string | null
}

export default function EditHojaRemisionPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [hoja, setHoja] = useState<EditableHojaRemision | null>(null)
  const initialIntent = searchParams.get("intent") === "upload" ? "upload" : "manual"

  useEffect(() => {
    let mounted = true

    async function loadHojaRemision() {
      try {
        const result = await getHojaRemision(params.id as string)
        if (!result.success || !result.data) {
          if (mounted) {
            toast.error("No se pudo cargar la hoja de remision.")
            router.push("/dashboard/hojas-remision")
          }
          return
        }

        if (mounted) {
          setHoja(result.data)
        }
      } catch {
        if (mounted) {
          toast.error("No se pudo cargar la hoja de remision.")
          router.push("/dashboard/hojas-remision")
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadHojaRemision()

    return () => {
      mounted = false
    }
  }, [params.id, router])

  if (loading) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center">
        <LoadingSpinner message="Cargando hoja de remision..." />
      </div>
    )
  }

  if (!hoja) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-[var(--kt-text-dark)]">Hoja de remision no encontrada</h2>
        <Button onClick={() => router.push("/dashboard/hojas-remision")}>Volver al listado</Button>
      </div>
    )
  }

  return (
    <HojaRemisionEditor
      mode="edit"
      documentId={hoja.id}
      documentNumber={hoja.numeroCompleto}
      initialFormData={hoja}
      initialIntent={initialIntent}
      onSave={async (data: HojaRemisionFormData, file?: File | null) =>
        updateHojaRemision(params.id as string, data, file ?? undefined)
      }
    />
  )
}
