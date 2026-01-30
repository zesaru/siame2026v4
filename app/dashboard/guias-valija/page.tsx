import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import GuiasValijaClient from "./GuiasValijaClient"

export default async function GuiasValijaPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Server-side data fetching (no waterfall)
  const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/dashboard/guias-valija`, {
    cache: 'no-store', // O usa revalidate si quieres caché
    headers: {
      // Pasar cookies de sesión
      'Cookie': (session as any)?.cookie || '',
    },
  })

  if (!response.ok) {
    // Manejar error o devolver array vacío
    console.error('Error fetching guias:', await response.text())
  }

  const initialGuias = response.ok ? await response.json() : []

  return <GuiasValijaClient session={session} initialGuias={initialGuias} />
}
