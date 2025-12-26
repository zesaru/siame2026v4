import { getServerSession } from "next-auth/next"
import { authOptions } from "../pages/api/auth/[...nextauth]"

// Helper function to get session in server components
export async function auth() {
  return getServerSession(authOptions)
}