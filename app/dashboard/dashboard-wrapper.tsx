import { auth } from "@/lib/auth-v4"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import DashboardClient from "./dashboard-client"
import DashboardSkeleton from "./dashboard-skeleton"

// Server component that handles authentication
async function DashboardServer() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return <DashboardClient userId={session.user.id} />
}

// Main page component
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardServer />
    </Suspense>
  )
}