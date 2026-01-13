import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyData() {
  console.log('📊 Verificando estado de la base de datos...\n')

  const [guias, hojas, documents, users] = await Promise.all([
    prisma.guiaValija.count(),
    prisma.hojaRemision.count(),
    prisma.document.count(),
    prisma.user.count(),
  ])

  console.log('   GuiaValija:', guias)
  console.log('   HojaRemision:', hojas)
  console.log('   Document:', documents)
  console.log('   Users:', users)
  console.log()

  if (guias === 0 && hojas === 0 && documents === 0 && users > 0) {
    console.log('✅ Reset exitoso!')
    console.log('   - Datos de prueba eliminados')
    console.log('   - Usuarios preservados:', users)
  } else {
    console.log('⚠️  Estado inesperado:')
    console.log('   - Guías:', guias, '(debería ser 0)')
    console.log('   - Hojas:', hojas, '(debería ser 0)')
    console.log('   - Documents:', documents, '(debería ser 0)')
    console.log('   - Users:', users, '(debería ser > 0)')
  }

  await prisma.$disconnect()
}

verifyData().catch(console.error)
