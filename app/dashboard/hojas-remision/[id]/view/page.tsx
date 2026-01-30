import { auth } from "@/lib/auth"
import { redirect, useParams } from "next/navigation"
import HojaRemisionViewClient from "./HojaRemisionViewClient"

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
