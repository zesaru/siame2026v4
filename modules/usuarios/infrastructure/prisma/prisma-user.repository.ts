import type { PrismaClient } from "@prisma/client"
import type {
  ChangePasswordInput,
  ChangePasswordResult,
  CreateUserInput,
  UpdateUserInput,
  UserRepository,
} from "../../domain/repositories"
import * as authService from "@/lib/services/auth.service"

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            documents: true,
            guiasValija: true,
            hojasRemision: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  }

  async existsByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    return !!user
  }

  async createUser(input: CreateUserInput) {
    return authService.createUser(input)
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            documents: true,
            guiasValija: true,
            hojasRemision: true,
          },
        },
      },
    })
  }

  async updateUser(id: string, input: UpdateUserInput) {
    return this.prisma.user.update({
      where: { id },
      data: input,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({
      where: { id },
    })
  }

  async changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { password: true },
    })

    if (!user || !user.password) {
      return { status: "user_not_found" }
    }

    const isValid = await authService.verifyPassword(input.currentPassword, user.password)
    if (!isValid) {
      return { status: "invalid_current_password" }
    }

    await authService.updatePassword(input.userId, input.newPassword)
    return { status: "changed" }
  }
}
