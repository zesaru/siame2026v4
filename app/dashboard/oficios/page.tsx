import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface OficiosPageProps {
  searchParams: Promise<{
    search?: string
    page?: string
  }>
}

export default async function OficiosPage({ searchParams }: OficiosPageProps) {
  const session = await auth()
  if (!session) {
    redirect("/auth/signin")
  }

  const params = await searchParams
  const search = (params.search || "").trim()
  const page = Math.max(1, Number(params.page || "1") || 1)
  const limit = 20

  const where = {
    userId: session.user.id,
    ...(search
      ? {
          OR: [
            { numeroOficio: { contains: search, mode: "insensitive" as const } },
            { asunto: { contains: search, mode: "insensitive" as const } },
            { remitente: { contains: search, mode: "insensitive" as const } },
            { destinatario: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [oficios, total] = await Promise.all([
    prisma.oficio.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        numeroOficio: true,
        asunto: true,
        remitente: true,
        destinatario: true,
        createdAt: true,
      },
    }),
    prisma.oficio.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Oficios</CardTitle>
          <CardDescription>Registros confirmados desde el flujo de análisis documental.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex gap-2" method="GET">
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar por número, asunto, remitente o destinatario"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
            <Button asChild>
              <Link href="/dashboard/documents">Ir a documentos</Link>
            </Button>
          </form>

          {oficios.length === 0 ? (
            <p className="text-sm text-[var(--kt-text-muted)]">No hay oficios para los filtros seleccionados.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 border-b bg-[var(--kt-gray-50)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--kt-text-muted)]">Nº Oficio</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--kt-text-muted)]">Asunto</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--kt-text-muted)]">Remitente</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--kt-text-muted)]">Destinatario</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--kt-text-muted)]">Fecha</th>
                    <th className="px-3 py-2 text-right font-semibold text-[var(--kt-text-muted)]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {oficios.map((oficio, index) => (
                    <tr key={oficio.id} className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-[var(--kt-gray-50)]/40"} hover:bg-[var(--kt-gray-50)]`}>
                      <td className="px-3 py-2 font-medium">{oficio.numeroOficio}</td>
                      <td className="px-3 py-2">{oficio.asunto || "N/A"}</td>
                      <td className="px-3 py-2">{oficio.remitente || "N/A"}</td>
                      <td className="px-3 py-2">{oficio.destinatario || "N/A"}</td>
                      <td className="px-3 py-2">{new Date(oficio.createdAt).toLocaleString("es-PE")}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/oficios/${oficio.id}/view`}>Ver</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/oficios/${oficio.id}/edit`}>Editar</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline" disabled={page <= 1}>
                  <Link href={`/dashboard/oficios?search=${encodeURIComponent(search)}&page=${Math.max(1, page - 1)}`}>
                    Anterior
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" disabled={page >= totalPages}>
                  <Link href={`/dashboard/oficios?search=${encodeURIComponent(search)}&page=${Math.min(totalPages, page + 1)}`}>
                    Siguiente
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
