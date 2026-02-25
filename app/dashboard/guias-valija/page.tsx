import { auth } from "@/lib/auth"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import GuiasValijaClient from "./GuiasValijaClient"

export default async function GuiasValijaPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Server-side data fetching against the current origin (avoids hardcoded localhost:3000)
  const requestHeaders = await headers()
  const cookieStore = await cookies()
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000"
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https")

  const response = await fetch(`${protocol}://${host}/api/dashboard/guias-valija`, {
    cache: 'no-store', // O usa revalidate si quieres caché
    headers: {
      // Reenviar cookies reales de la request para auth en la API route
      Cookie: cookieStore.toString(),
    },
  })

  if (!response.ok) {
    // Manejar error o devolver array vacío
    console.error('Error fetching guias:', await response.text())
  }

  const initialGuias = response.ok ? await response.json() : []

  return <GuiasValijaClient session={session} initialGuias={initialGuias} />
}
