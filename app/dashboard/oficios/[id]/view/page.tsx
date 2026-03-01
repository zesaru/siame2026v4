import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-v4"
import OficioViewClient from "./OficioViewClient"

interface OficioViewPageProps {
  params: Promise<{ id: string }>
}

export default async function OficioViewPage({ params }: OficioViewPageProps) {
  const session = await auth()
  if (!session) {
    redirect("/auth/signin")
  }

  const { id } = await params

  return <OficioViewClient oficioId={id} />
}
