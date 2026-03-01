import type { PrismaClient, Prisma } from "@prisma/client"
import type { DocumentRepository, ListDocumentsParams } from "../../domain/repositories"

export class PrismaDocumentRepository implements DocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listDocuments(params: ListDocumentsParams) {
    const { userId, page, limit, search, reviewStatus, documentType } = params
    const skip = (page - 1) * limit

    const where: Prisma.DocumentWhereInput = { userId }
    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: "insensitive" } },
        { contentText: { contains: search, mode: "insensitive" } },
      ]
    }
    if (reviewStatus) {
      where.metadata = {
        path: ["reviewStatus"],
        equals: reviewStatus,
      }
    }
    if (documentType) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          metadata: {
            path: ["analysis", "tipoDocumento"],
            equals: documentType,
          },
        },
      ]
    }

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          fileType: true,
          fileExtension: true,
          pageCount: true,
          language: true,
          tableCount: true,
          keyValueCount: true,
          entityCount: true,
          processingStatus: true,
          metadata: true,
          createdAt: true,
          analyzedAt: true,
        },
      }),
      this.prisma.document.count({ where }),
    ])

    return { documents, total }
  }

  async getDocumentByIdForUser({ id, userId }: { id: string; userId: string }) {
    return this.prisma.document.findFirst({
      where: { id, userId },
    })
  }

  async deleteDocumentByIdForUser({ id, userId }: { id: string; userId: string }) {
    const existing = await this.prisma.document.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!existing) {
      return false
    }

    await this.prisma.document.delete({
      where: { id },
    })

    return true
  }

  async updateKeyValuePairsByIdForUser({
    id,
    userId,
    keyValuePairs,
  }: {
    id: string
    userId: string
    keyValuePairs: unknown[]
  }) {
    const existing = await this.prisma.document.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!existing) {
      return null
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        keyValuePairs,
        keyValueCount: keyValuePairs.length,
        updatedAt: new Date(),
      },
    })
  }
}
