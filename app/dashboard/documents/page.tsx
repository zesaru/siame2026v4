import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DocumentsClient from "./DocumentsClient"

export default async function DocumentsPage() {
  // Server-side auth check (no waterfall)
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  // Pass session to client component (already authenticated)
  return (
    <div className="min-h-screen bg-gray-50">
      <DocumentsClient session={session} />
    </div>
  )
}
