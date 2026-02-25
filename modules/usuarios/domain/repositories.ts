import type { Role } from "@prisma/client"

export interface UserListRow {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: Date
  updatedAt: Date
  _count: {
    documents: number
    guiasValija: number
    hojasRemision: number
  }
}

export interface UserRepository {
  listUsers(): Promise<UserListRow[]>
  existsByEmail(email: string): Promise<boolean>
  createUser(input: CreateUserInput): Promise<CreatedUserRow>
  getUserById(id: string): Promise<UserDetailRow | null>
  updateUser(id: string, input: UpdateUserInput): Promise<UpdatedUserRow>
  deleteUser(id: string): Promise<void>
  changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult>
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: Role
}

export interface CreatedUserRow {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: Date
}

export interface UserDetailRow {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: Date
  updatedAt: Date
  _count: {
    documents: number
    guiasValija: number
    hojasRemision: number
  }
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: Role
}

export interface UpdatedUserRow {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: Date
  updatedAt: Date
}

export interface ChangePasswordInput {
  userId: string
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordResult {
  status: "changed" | "invalid_current_password" | "user_not_found"
}
