import type { DefaultSession, DefaultUser } from "next-auth"
import type { Role } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: Role
      sessionVersion?: number
      sessionId?: string
    } & DefaultSession["user"]
    revoked?: boolean
  }

  interface User extends DefaultUser {
    role: Role
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role
    sessionVersion?: number
    revoked?: boolean
    sid?: string
  }
}
