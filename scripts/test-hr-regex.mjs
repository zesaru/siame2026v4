// Función extraída del parser
function extractHRNumeroFromContenido(contenido) {
  if (!contenido) return { match: false }

  // Patrón: "HR Nº" seguido de números y opcionalmente texto
  const hrPattern = /^HR\s*N[º°]\s*(\d+)([^/]*)/i
  const match = contenido.match(hrPattern)

  if (!match) return { match: false }

  const numero = parseInt(match[1]) || 0
  const numeroCompleto = contenido.trim()  // Guardar el contenido completo como numeroCompleto

  // Intentar extraer sigla de unidad del formato (ej: "HR Nº5-18-A/ 3 CAJA")
  // El formato parece ser: HR Nº{numero}-{algo}-{sigla}/ ...
  const siglaMatch = contenido.match(/HR\s*N[º°]\s*\d+[^/]*-([A-Z]{2,4})/i)
  const siglaUnidad = siglaMatch ? siglaMatch[1].toUpperCase() : null

  return {
    match: true,
    numeroCompleto,
    numero,
    siglaUnidad,
    contenidoRestante: contenido
  }
}

// Datos reales de la guía 24
const testCases = [
  "HR N°5-18-A/ 46",
  "HR Nº5-18-A/ 47 PAQUETE",
  "CAJA MEDICINAS",
  "VALIJA Nº24"
]

console.log("🧪 TEST DE REGEX PARA HOJAS DE REMISIÓN\n")
console.log("═".repeat(70))

testCases.forEach((contenido, index) => {
  console.log(`\nTest ${index + 1}: "${contenido}"`)
  const resultado = extractHRNumeroFromContenido(contenido)

  if (resultado.match) {
    console.log(`  ✅ MATCH ENCONTRADO`)
    console.log(`  Número Completo: ${resultado.numeroCompleto}`)
    console.log(`  Número: ${resultado.numero}`)
    console.log(`  Sigla Unidad: ${resultado.siglaUnidad || 'N/A'}`)
  } else {
    console.log(`  ❌ SIN MATCH`)
  }
})

console.log("\n" + "═".repeat(70))
