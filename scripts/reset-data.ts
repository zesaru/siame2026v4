import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetData() {
  console.log('🔄 Iniciando reset de datos...')

  try {
    // Eliminar en orden inverso de dependencia para evitar constraint errors
    console.log('   📁 Eliminando FileAuditLog...')
    await prisma.fileAuditLog.deleteMany({})

    console.log('   📋 Eliminando HojaRemision...')
    await prisma.hojaRemision.deleteMany({})

    console.log('   🔒 Eliminando GuiaValijaPrecinto...')
    await prisma.guiaValijaPrecinto.deleteMany({})

    console.log('   📦 Eliminando GuiaValijaItem...')
    await prisma.guiaValijaItem.deleteMany({})

    console.log('   📨 Eliminando GuiaValija...')
    await prisma.guiaValija.deleteMany({})

    console.log('   📄 Eliminando Document...')
    await prisma.document.deleteMany({})

    console.log('   🔑 Eliminando VerificationToken...')
    await prisma.verificationToken.deleteMany({})

    console.log('✅ Datos eliminados correctamente!')
    console.log('ℹ️  Usuarios y sesiones han sido preservados.')

  } catch (error) {
    console.error('❌ Error durante el reset:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

resetData()
  .then(() => {
    console.log('✨ Proceso completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
