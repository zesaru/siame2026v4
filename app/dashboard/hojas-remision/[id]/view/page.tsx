import { auth } from "@/lib/auth"
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

  // Pass session and ID to client component
  return (
    <HojaRemisionViewClient session={session} hojaId={hojaId} />
  )
}
