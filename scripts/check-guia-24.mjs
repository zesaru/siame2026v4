import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkGuia24() {
  console.log('🔍 Buscando Guía de Valija número 24...\n')

  // Buscar la guía
  const guia = await prisma.guiaValija.findFirst({
    where: {
      numeroGuia: {
        contains: '24'
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  if (!guia) {
    console.log('❌ No se encontró ninguna guía con número 24')
    return
  }

  console.log('📦 GUIA DE VALIJA')
  console.log('═'.repeat(70))
  console.log(`ID:              ${guia.id}`)
  console.log(`Número:          ${guia.numeroGuia}`)
  console.log(`Fecha Envío:     ${guia.fechaEnvio ? guia.fechaEnvio.toLocaleDateString('es-PE') : 'N/A'}`)
  console.log(`Estado:          ${guia.estado}`)
  console.log(`Destino:         ${guia.destinoCiudad || 'N/A'}, ${guia.destinoPais || 'N/A'}`)
  console.log(`Archivo PDF:     ${guia.filePath ? '✅ Sí - ' + guia.filePath : '❌ No'}`)
  console.log(`Hash SHA-256:    ${guia.fileHash || 'N/A'}`)
  console.log()

  // Buscar items
  const items = await prisma.guiaValijaItem.findMany({
    where: {
      guiaValijaId: guia.id
    },
    orderBy: {
      numeroItem: 'asc'
    }
  })

  console.log(`📦 ITEMS (${items.length})`)
  console.log('═'.repeat(70))
  items.forEach((item, index) => {
    console.log(`\nItem ${item.numeroItem}:`)
    console.log(`  Destinatario:  ${item.destinatario}`)
    console.log(`  Contenido:     ${item.contenido}`)
    console.log(`  Remitente:    ${item.remitente || 'N/A'}`)
    console.log(`  Cantidad:     ${item.cantidad || 'N/A'}`)
    console.log(`  Peso:         ${item.peso ? item.peso + ' kg' : 'N/A'}`)
  })
  console.log()

  // Buscar hojas de remisión relacionadas
  const hojasRemision = await prisma.hojaRemision.findMany({
    where: {
      numeroCompleto: {
        contains: '24'
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  })

  console.log(`📋 HOJAS DE REMISIÓN (${hojasRemision.length})`)
  console.log('═'.repeat(70))
  if (hojasRemision.length > 0) {
    hojasRemision.forEach(hr => {
      console.log(`\n${hr.numeroCompleto}`)
      console.log(`  Sigla:        ${hr.siglaUnidad || 'N/A'}`)
      console.log(`  Para:         ${hr.para}`)
      console.log(`  Asunto:       ${hr.asunto?.substring(0, 100) || 'N/A'}...`)
      console.log(`  Destino:      ${hr.destino}`)
      console.log(`  Fecha:        ${hr.fecha ? hr.fecha.toLocaleDateString('es-PE') : 'N/A'}`)
      console.log(`  Estado:       ${hr.estado}`)
      console.log(`  Archivo PDF:  ${hr.filePath ? '✅ Sí' : '❌ No'}`)
    })
  } else {
    console.log('No se encontraron hojas de remisión relacionadas')
  }

  console.log()
  console.log('═'.repeat(70))
  console.log('✅ Verificación completada')

  await prisma.$disconnect()
}

checkGuia24().catch(console.error)
