import type { Role } from "@prisma/client"
import type { CreatedUserRow, UpdatedUserRow, UserDetailRow, UserListRow } from "../domain/repositories"

export interface UserListDto {
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

export type UserListSource = UserListRow
export type CreatedUserSource = CreatedUserRow
export type UserDetailSource = UserDetailRow
export type UpdatedUserSource = UpdatedUserRow

export interface CreatedUserDto {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: Date
}

export interface UserDetailDto {
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

export interface UpdatedUserDto {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: Date
  updatedAt: Date
}
