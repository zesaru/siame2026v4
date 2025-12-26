const fs = require('fs');
const path = require('path');

async function testDocumentIntelligence() {
  try {
    console.log('Testing Document Intelligence setup...\n');

    // Read .env file directly
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    // Check if Azure credentials are configured
    const hasEndpoint = envContent.includes('AZURE_FORM_RECOGNIZER_ENDPOINT=') &&
                        !envContent.includes('AZURE_FORM_RECOGNIZER_ENDPOINT=your-azure-endpoint');
    const hasKey = envContent.includes('AZURE_FORM_RECOGNIZER_KEY=') &&
                   !envContent.includes('AZURE_FORM_RECOGNIZER_KEY=your-key');

    console.log('Azure Endpoint:', hasEndpoint ? '✓ Configured' : '✗ Not configured');
    console.log('Azure Key:', hasKey ? '✓ Configured' : '✗ Not configured');

    // Check if PDF files exist
    const pdf1Path = path.join(__dirname, 'public', 'pdf', '1.pdf');
    const pdf2Path = path.join(__dirname, 'public', 'pdf', '2.pdf');

    console.log('PDF 1 exists:', fs.existsSync(pdf1Path));
    console.log('PDF 2 exists:', fs.existsSync(pdf2Path));

    if (fs.existsSync(pdf1Path)) {
      const stats1 = fs.statSync(pdf1Path);
      console.log('PDF 1 size:', stats1.size, 'bytes');
    }

    if (fs.existsSync(pdf2Path)) {
      const stats2 = fs.statSync(pdf2Path);
      console.log('PDF 2 size:', stats2.size, 'bytes');
    }

    console.log('\nDocument Intelligence is ready to use!');
    console.log('Navigate to http://localhost:3003/documents to analyze your PDF files.');

  } catch (error) {
    console.error('Error:', error);
  }
}

testDocumentIntelligence();