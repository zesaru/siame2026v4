import { auth } from "@/lib/auth-v4"
import type { Role } from "@prisma/client"

/**
 * Role hierarchy for authorization checks
 * Higher number = more privileges
 */
const ROLE_LEVELS: Record<Role, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  USER: 1,
}

/**
 * Get the authenticated user from the session
 */
export async function getAuthenticatedUser() {
  const session = await auth()

  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name,
    role: session.user.role,
  }
}

/**
 * Check if user has required role
 */
export function hasRole(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole)
}

/**
 * Check if user's role level is at least the required level
 */
export function hasRoleLevel(userRole: Role, requiredLevel: number): boolean {
  return ROLE_LEVELS[userRole] >= requiredLevel
}

/**
 * Check if actor can manage target user
 * - SUPER_ADMIN can manage all users
 * - ADMIN can only manage USER role users
 * - USER cannot manage any users
 */
export function canManageUser(actorRole: Role, targetRole: Role): boolean {
  const actorLevel = ROLE_LEVELS[actorRole]
  const targetLevel = ROLE_LEVELS[targetRole]

  // User cannot manage anyone
  if (actorLevel === 1) {
    return false
  }

  // SUPER_ADMIN can manage everyone
  if (actorRole === "SUPER_ADMIN") {
    return true
  }

  // ADMIN can only manage USER (not other ADMINs or SUPER_ADMIN)
  if (actorRole === "ADMIN") {
    return targetLevel === 1
  }

  return false
}

/**
 * Check if actor can assign specific role
 * - SUPER_ADMIN can assign any role
 * - ADMIN can only assign USER role
 * - USER cannot assign any roles
 */
export function canAssignRole(actorRole: Role, roleToAssign: Role): boolean {
  if (actorRole === "SUPER_ADMIN") {
    return true
  }

  if (actorRole === "ADMIN") {
    return roleToAssign === "USER"
  }

  return false
}

/**
 * Require specific roles for an action
 * Throws error if user doesn't have required role
 */
export async function requireRole(allowedRoles: Role[]): Promise<void> {
  const user = await getAuthenticatedUser()

  if (!user) {
    throw new Error("Unauthorized: No session found")
  }

  if (!hasRole(user.role, allowedRoles)) {
    throw new Error(`Forbidden: Requires one of roles: ${allowedRoles.join(", ")}`)
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthorizationError"
  }
}
