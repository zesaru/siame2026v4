import { getServerSession } from "next-auth/next"
import { authOptions } from "../pages/api/auth/[...nextauth]"

// Re-export authOptions for use in API routes
export { authOptions }

// Helper function to get session in server components
export async function auth() {
  return getServerSession(authOptions)
}