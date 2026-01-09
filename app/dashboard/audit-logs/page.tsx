import { auth } from "@/lib/auth-v4"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/middleware/authorization"
import AuditLogsClient from "./audit-logs-client"

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Audit Logs - SIAME 2026",
  description: "Registro de auditoría de acceso a documentos",
}

export default async function AuditLogsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // Solo SUPER_ADMIN puede acceder
  try {
    await requireRole(["SUPER_ADMIN"])
  } catch (error) {
    redirect("/dashboard")
  }

  return <AuditLogsClient />
}
