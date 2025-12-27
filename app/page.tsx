import { redirect } from "next/navigation"
import { auth } from "@/lib/auth-v4"

export default async function Home() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Si está autenticado, redirigir al dashboard
  redirect("/dashboard")
}
