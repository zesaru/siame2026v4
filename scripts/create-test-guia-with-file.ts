import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Creating test GuiaValija with file...')

  // Get the admin user
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@siame.com' }
  })

  if (!admin) {
    console.error('Admin user not found. Run create-test-user.ts first.')
    return
  }

  // Create a test guia with a filePath
  const guia = await prisma.guiaValija.create({
    data: {
      userId: admin.id,
      numeroGuia: 'TEST-2025-001',
      tipoValija: 'ENTRADA',
      fechaEmision: new Date(),
      estado: 'recibido',
      processingStatus: 'completed',
      filePath: 'GUIAENTRADA/2025/01/TEST-2025-001-abc123.pdf',
      fileMimeType: 'application/pdf',
      destinatarioNombre: 'Embajada de Prueba',
      destinoCiudad: 'Ciudad de Prueba',
      destinoPais: 'País de Prueba',
      remitenteNombre: 'Remitente de Prueba',
      descripcionContenido: 'Contenido de prueba para verificación de archivo'
    }
  })

  console.log('Created guia:', guia.numeroGuia)
  console.log('File path:', guia.filePath)
  console.log('User:', admin.email)
  console.log('Role:', admin.role)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
