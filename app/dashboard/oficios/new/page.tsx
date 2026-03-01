import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface OficioReviewPageProps {
  searchParams: Promise<{
    documentId?: string
    tipoDocumento?: string
    direccion?: string
    idioma?: string
  }>
}

export default async function OficioReviewPage({ searchParams }: OficioReviewPageProps) {
  const params = await searchParams

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Revisión de Oficio</CardTitle>
          <CardDescription>
            El documento fue clasificado como oficio. Revisa la información detectada antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[var(--kt-text-muted)]">Documento</p>
              <p className="font-medium">{params.documentId || "N/A"}</p>
            </div>
            <div>
              <p className="text-[var(--kt-text-muted)]">Tipo detectado</p>
              <p className="font-medium">{params.tipoDocumento || "oficio"}</p>
            </div>
            <div>
              <p className="text-[var(--kt-text-muted)]">Dirección</p>
              <p className="font-medium">{params.direccion || "N/A"}</p>
            </div>
            <div>
              <p className="text-[var(--kt-text-muted)]">Idioma</p>
              <p className="font-medium">{params.idioma || "N/A"}</p>
            </div>
          </div>

          <p className="text-sm text-[var(--kt-text-muted)]">
            Esta pantalla es un paso de revisión manual inicial. El parser completo de oficio se implementará en una fase posterior.
          </p>

          <div className="flex gap-2">
            <Button asChild>
              <Link href="/dashboard/documents">Volver a documentos</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/oficios">Ir a oficios</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
