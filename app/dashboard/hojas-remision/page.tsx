import { auth } from "@/lib/auth-v4"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/badge"

async function getHojasRemision(userId: string) {
  return await prisma.hojaRemision.findMany({
    where: { userId },
    include: {
      items: true,
    },
    orderBy: { fechaRemision: "desc" },
  })
}

export default async function HojasRemisionPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  const hojas = await getHojasRemision(session.user.id)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">
            Hojas de Remisión
          </h1>
          <p className="text-[var(--kt-text-muted)] mt-1">
            Gestiona tus documentos de envío
          </p>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hojas Registradas ({hojas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {hojas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--kt-text-muted)]">
                No hay hojas de remisión registradas
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--kt-gray-200)]">
                <thead className="bg-[var(--kt-gray-50)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Destinatario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--kt-text-muted)] uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[var(--kt-gray-200)]">
                  {hojas.map((hoja) => (
                    <tr key={hoja.id} className="hover:bg-[var(--kt-gray-50)]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-[var(--kt-text-dark)]">
                          {hoja.numeroRemision}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-muted)] capitalize">
                          {hoja.tipoRemision}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-dark)]">
                          {hoja.destinatarioNombre}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {new Date(hoja.fechaRemision).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-[var(--kt-text-muted)]">
                          {hoja.items.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={hoja.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
