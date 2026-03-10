import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const docs = await prisma.document.findMany({
  select: {
    id: true,
    fileName: true,
    fileType: true,
    createdAt: true
  },
  orderBy: { createdAt: 'desc' }
})

console.log(`Total documents: ${docs.length}\n`)
docs.forEach((doc, i) => {
  console.log(`${i + 1}. ${doc.fileName}`)
  console.log(`   ID: ${doc.id}`)
  console.log(`   Type: ${doc.fileType}`)
  console.log(`   Created: ${doc.createdAt}`)
  console.log('')
})

await prisma.$disconnect()
