import { auth } from "@/lib/auth-v4"
import { redirect } from "next/navigation"
import DashboardLayout from "@/components/dashboard/DashboardLayout"

export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return <DashboardLayout session={session}>{children}</DashboardLayout>
}
