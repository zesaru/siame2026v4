import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const result = await prisma.document.deleteMany({})

console.log(`✓ Eliminados ${result.count} documentos`)

await prisma.$disconnect()
