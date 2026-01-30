import { auth } from "@/lib/auth"
import { redirect, useParams } from "next/navigation"
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

export default async function HojaRemisionViewPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  const params = useParams()
  const hojaId = params.id as string

  // Pass session and ID to client component
  return (
    <HojaRemisionViewClient session={session} hojaId={hojaId} />
  )
}
