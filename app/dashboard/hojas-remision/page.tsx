import HojasRemisionClient from "@/components/dashboard/HojasRemisionClient"
import { auth } from "@/lib/auth-v4"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

async function getHojasRemision(userId: string) {
  return prisma.hojaRemision.findMany({
    where: { userId },
    orderBy: [{ numeroCompleto: "desc" }, { fecha: "desc" }],
  })
}

export default async function Page() {
  const session = await auth()
  if (!session) {
    redirect("/auth/signin")
  }

  const hojas = await getHojasRemision(session.user.id)
  return <HojasRemisionClient initialHojas={hojas} />
}
