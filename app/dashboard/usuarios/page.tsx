import { auth } from "@/lib/auth-v4"
import { redirect } from "next/navigation"
import UsersClient from "./users-client"

export default async function UsersPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Only SUPER_ADMIN and ADMIN can access this page
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--kt-text-dark)]">
          Gestión de Usuarios
        </h1>
        <p className="text-[var(--kt-text-muted)]">
          Administra los usuarios del sistema y sus roles
        </p>
      </div>

      <UsersClient currentUserId={session.user.id} currentUserRole={session.user.role} />
    </div>
  )
}
