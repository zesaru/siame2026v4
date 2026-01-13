import fs from 'fs/promises'
import path from 'path'

// Create a minimal valid PDF (PDF 1.4 specification)
function createMinimalPDF(): Buffer {
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
50 700 Td
(Test PDF Document) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000262 00000 n
0000000341 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
430
%%EOF
`

  return Buffer.from(pdfContent, 'utf-8')
}

async function main() {
  console.log('Creating test PDF file...')

  // Storage root path
  const storageRoot = path.join(process.cwd(), 'storage')
  const relativePath = 'GUIAENTRADA/2025/01/TEST-2025-001-abc123.pdf'
  const absolutePath = path.join(storageRoot, relativePath.replace(/\//g, path.sep))

  // Create directory structure
  const directory = path.dirname(absolutePath)
  await fs.mkdir(directory, { recursive: true })

  // Create minimal PDF
  const pdfBuffer = createMinimalPDF()

  // Write file
  await fs.writeFile(absolutePath, pdfBuffer)

  console.log('✅ Test PDF created successfully!')
  console.log('   Path:', absolutePath)
  console.log('   Size:', pdfBuffer.length, 'bytes')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
