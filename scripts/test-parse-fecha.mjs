// Test de la función parseFecha corregida
function parseFecha(fechaStr) {
  if (!fechaStr) return null

  // Limpiar caracteres problemáticos que puede incluir Azure OCR
  // Ejemplo: "19(/12/2025" -> "19/12/2025"
  const cleanedFechaStr = fechaStr
    .replace(/[()[\]{}]/g, '') // Eliminar paréntesis, corchetes, llaves
    .replace(/\s+/g, '')        // Eliminar espacios extras
    .trim()

  // Formato DD/MM/YYYY
  const matchSlash = cleanedFechaStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (matchSlash) {
    const [, day, month, year] = matchSlash
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  }

  // Formato "D de MMMM del YYYY" o "DD de MMMM del YYYY"
  // Ejemplo: "5 de Septiembre del 2025"
  const matchText = cleanedFechaStr.match(/(\d{1,2})\s+de\s+(\w+)\s+del\s+(\d{4})/i)
  if (matchText) {
    const [, day, monthStr, year] = matchText

    // Mapeo de meses en español a inglés (para Date constructor)
    const meses = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'setiembre': 8, 'octubre': 9,
      'noviembre': 10, 'diciembre': 11
    }

    const month = meses[monthStr.toLowerCase()]
    if (month !== undefined) {
      return new Date(parseInt(year), month, parseInt(day))
    }
  }

  // Intentar parseo directo (como fallback)
  const date = new Date(cleanedFechaStr)
  return isNaN(date.getTime()) ? null : date
}

// Test cases
const testCases = [
  "19(/12/2025",      // Azure OCR con paréntesis incorrecto
  "19/12/2025",       // Formato correcto
  "5/9/2025",         // Día y mes con 1 dígito
  "24/12/2025",       // Fecha de recibo
  "(24/12/2025)",     // Con paréntesis
  "19 de diciembre del 2025", // Formato textual
]

console.log("🧪 TEST DE PARSE FECHA CORREGIDA\n")
console.log("═".repeat(70))

testCases.forEach((fechaStr, index) => {
  console.log(`\nTest ${index + 1}: "${fechaStr}"`)
  const resultado = parseFecha(fechaStr)

  if (resultado) {
    console.log(`  ✅ FECHA PARSEADA`)
    console.log(`  ISO: ${resultado.toISOString()}`)
    console.log(`  Formato local: ${resultado.toLocaleDateString('es-PE')}`)
  } else {
    console.log(`  ❌ NO SE PUDO PARSEAR`)
  }
})

console.log("\n" + "═".repeat(70))
