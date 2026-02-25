import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { toGuiaValijaListDto } from "@/modules/guias-valija/application/mappers"
import { ListGuiasValijaByUserUseCase } from "@/modules/guias-valija/application/queries"
import { PrismaGuiaValijaRepository } from "@/modules/guias-valija/infrastructure"
import GuiasValijaClient from "./GuiasValijaClient"

export default async function GuiasValijaPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Avoid internal HTTP hop: call use case/repository directly from the Server Component.
  const useCase = new ListGuiasValijaByUserUseCase(new PrismaGuiaValijaRepository(prisma))
  const result = await useCase.execute({ userId: session.user.id })
  const initialGuias = result.ok ? toGuiaValijaListDto(result.value) : []

  return <GuiasValijaClient initialGuias={initialGuias} />
}
