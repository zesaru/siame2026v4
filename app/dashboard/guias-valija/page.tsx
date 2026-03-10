import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { toGuiaValijaListDto } from "@/modules/guias-valija/application/mappers"
import { ListGuiasValijaByUserUseCase } from "@/modules/guias-valija/application/queries"
import { PrismaGuiaValijaRepository } from "@/modules/guias-valija/infrastructure"
import GuiasValijaClient from "./GuiasValijaClient"
import { canViewAllRecords } from "@/lib/middleware/authorization"

export default async function GuiasValijaPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Avoid internal HTTP hop: call use case/repository directly from the Server Component.
  const result = canViewAllRecords(session.user.role)
    ? await (async () => {
        const value = await prisma.guiaValija.findMany({
          select: {
            id: true,
            numeroGuia: true,
            fechaEmision: true,
            tipoValija: true,
            isExtraordinaria: true,
            fechaEnvio: true,
            fechaRecibo: true,
            origenCiudad: true,
            destinoCiudad: true,
            origenPais: true,
            destinoPais: true,
            destinatarioNombre: true,
            remitenteNombre: true,
            pesoValija: true,
            numeroPaquetes: true,
            estado: true,
            processingStatus: true,
            filePath: true,
            fileMimeType: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            items: {
              select: {
                id: true,
                numeroItem: true,
                destinatario: true,
                contenido: true,
                remitente: true,
                cantidad: true,
                peso: true,
              },
            },
            precintos: {
              select: {
                id: true,
                precinto: true,
                precintoCable: true,
                numeroBolsaTamano: true,
                guiaAereaNumero: true,
              },
            },
            _count: { select: { items: true, precintos: true } },
          },
          orderBy: { createdAt: "desc" },
        })
        return { ok: true as const, value }
      })()
    : await (async () => {
        const useCase = new ListGuiasValijaByUserUseCase(new PrismaGuiaValijaRepository(prisma))
        return useCase.execute({ userId: session.user.id })
      })()
  const initialGuias = result.ok ? toGuiaValijaListDto(result.value) : []

  return <GuiasValijaClient initialGuias={initialGuias} currentUserRole={session.user.role} />
}
