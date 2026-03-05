import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkHojasRemision() {
  console.log('🔍 Buscando Hojas de Remisión de la guía 24...\n')

  // Buscar las HR que se acaban de crear
  const hojas = await prisma.hojaRemision.findMany({
    where: {
      numeroCompleto: {
        contains: '5-18-A'
      },
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24 horas
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  console.log(`📋 HOJAS DE REMISIÓN encontradas: ${hojas.length}\n`)

  hojas.forEach(hr => {
    console.log('─'.repeat(70))
    console.log(`ID:              ${hr.id}`)
    console.log(`Número Completo: ${hr.numeroCompleto}`)
    console.log(`Número:         ${hr.numero}`)
    console.log(`Sigla Unidad:    ${hr.siglaUnidad || 'N/A'}`)
    console.log(`Para:            ${hr.para}`)
    console.log(`Remitente:       ${hr.remitente}`)
    console.log(`Asunto:          ${hr.asunto}`)
    console.log(`Destino:         ${hr.destino}`)
    console.log(`Peso:            ${hr.peso || 'N/A'} kg`)
    console.log(`Fecha:           ${hr.fecha ? hr.fecha.toLocaleDateString('es-PE') : 'N/A'}`)
    console.log(`Estado:          ${hr.estado}`)
    console.log(`Archivo PDF:     ${hr.filePath ? '✅ Sí' : '❌ No'}`)
  })

  await prisma.$disconnect()
}

checkHojasRemision().catch(console.error)
