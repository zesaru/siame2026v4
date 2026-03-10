import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

console.log('Limpiando tablas de datos...')

// Limpiar en orden correcto (respetando foreign keys)
const oficioResult = await prisma.oficio.deleteMany({})
console.log(`✓ Oficio: ${oficioResult.count} eliminados`)

const hojaRemisionResult = await prisma.hojaRemision.deleteMany({})
console.log(`✓ HojaRemision: ${hojaRemisionResult.count} eliminadas`)

const precintoResult = await prisma.guiaValijaPrecinto.deleteMany({})
console.log(`✓ GuiaValijaPrecinto: ${precintoResult.count} eliminados`)

const itemResult = await prisma.guiaValijaItem.deleteMany({})
console.log(`✓ GuiaValijaItem: ${itemResult.count} eliminados`)

const guiaResult = await prisma.guiaValija.deleteMany({})
console.log(`✓ GuiaValija: ${guiaResult.count} eliminadas`)

const docResult = await prisma.document.deleteMany({})
console.log(`✓ Document: ${docResult.count} eliminados`)

console.log('\n✓ Limpieza completada')

await prisma.$disconnect()
