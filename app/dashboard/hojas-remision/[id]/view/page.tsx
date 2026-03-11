import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { canViewAllRecords } from "@/lib/middleware/authorization"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import HojaRemisionViewClient from "./HojaRemisionViewClient"

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params

  return {
    title: `Hoja de Remisión #${id} | SIAME 2026`,
    description: `Ver detalles de la hoja de remisión #${id} en el sistema SIAME 2026`,
  }
}

export default async function HojaRemisionViewPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  const { id: hojaId } = await params
  const isAdmin = canViewAllRecords(session.user.role)
  const initialHoja = await prisma.hojaRemision.findFirst({
    where: isAdmin ? { id: hojaId } : { id: hojaId, userId: session.user.id },
  })

  return (
    <HojaRemisionViewClient session={session} hojaId={hojaId} initialHoja={initialHoja} />
  )
}
