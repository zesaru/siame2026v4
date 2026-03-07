"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { withTrackView } from "@/lib/utils"

interface OficioViewClientProps {
  oficioId: string
}

interface OficioDetail {
  id: string
  numeroOficio: string
  asunto: string | null
  remitente: string | null
  destinatario: string | null
  referencia: string | null
  sourceDocumentId: string
  createdAt: string
}

export default function OficioViewClient({ oficioId }: OficioViewClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [oficio, setOficio] = useState<OficioDetail | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      try {
        const response = await fetch(withTrackView(`/api/oficios/${oficioId}`, true), {
          signal: controller.signal,
        })
        const data = await response.json()

        if (!response.ok) {
          if (response.status === 404) {
            setOficio(null)
            return
          }
          throw new Error(data.error || "No se pudo cargar el oficio")
        }

        setOficio(data as OficioDetail)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return
        toast.error(error instanceof Error ? error.message : "Error al cargar oficio")
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [oficioId])

  if (loading) {
    return (
      <Card className="mx-auto mt-6 max-w-4xl">
        <CardContent className="py-10">
          <LoadingSpinner message="Cargando oficio..." />
        </CardContent>
      </Card>
    )
  }

  if (!oficio) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Oficio no encontrado</CardTitle>
            <CardDescription>No se encontró el oficio solicitado o no tienes acceso.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/dashboard/oficios")}>Volver al listado</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Oficio Confirmado</CardTitle>
          <CardDescription>
            Registro generado desde el flujo de verificación de documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[var(--kt-text-muted)]">Nº Oficio</p>
              <p className="font-medium">{oficio.numeroOficio}</p>
            </div>
            <div>
              <p className="text-[var(--kt-text-muted)]">Documento fuente</p>
              <p className="font-medium">{oficio.sourceDocumentId}</p>
            </div>
            <div>
              <p className="text-[var(--kt-text-muted)]">Remitente</p>
              <p className="font-medium">{oficio.remitente || "N/A"}</p>
            </div>
            <div>
              <p className="text-[var(--kt-text-muted)]">Destinatario</p>
              <p className="font-medium">{oficio.destinatario || "N/A"}</p>
            </div>
            <div>
              <p className="text-[var(--kt-text-muted)]">Referencia</p>
              <p className="font-medium">{oficio.referencia || "N/A"}</p>
            </div>
            <div>
              <p className="text-[var(--kt-text-muted)]">Fecha de creación</p>
              <p className="font-medium">{new Date(oficio.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <p className="text-[var(--kt-text-muted)] text-sm">Asunto</p>
            <p className="font-medium">{oficio.asunto || "N/A"}</p>
          </div>

          <div className="flex gap-2">
            <Button asChild>
              <Link href="/dashboard/documents">Volver a documentos</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/dashboard/oficios/${oficio.id}/edit`}>Editar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/verify?documentId=${oficio.sourceDocumentId}`}>Volver a verificación</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
