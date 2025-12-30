import { auth } from "@/lib/auth-v4"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import HojasRemisionClient from "@/components/dashboard/HojasRemisionClient"

async function getHojasRemision(userId: string) {
  return await prisma.hojaRemision.findMany({
    where: { userId },
    orderBy: [
      { numeroCompleto: "desc" },
      { fecha: "desc" },
    ],
  })
}

export default async function HojasRemisionPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  const hojas = await getHojasRemision(session.user.id)

  return <HojasRemisionClient initialHojas={hojas} />
}
