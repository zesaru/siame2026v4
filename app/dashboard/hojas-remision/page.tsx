import HojasRemisionClient from "@/components/dashboard/HojasRemisionClient"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

async function getHojasRemision() {
  return prisma.hojaRemision.findMany({
    orderBy: [{ numeroCompleto: "desc" }, { fecha: "desc" }],
  })
}

export default async function Page() {
  const session = await auth()
  if (!session) {
    redirect("/auth/signin")
  }

  const hojas = await getHojasRemision()
  return <HojasRemisionClient initialHojas={hojas} currentUserRole={session.user.role} />
}
