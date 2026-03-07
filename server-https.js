/**
 * HTTPS Server for SIAME 2026
 * Runs Next.js on port 3000 behind an HTTPS proxy on port 443
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const PORT = 443
const NEXT_PORT = 3000

const certPath = path.join(__dirname, 'certs')
const sslOptions = {
  key: fs.readFileSync(path.join(certPath, 'localhost+4-key.pem')),
  cert: fs.readFileSync(path.join(certPath, 'localhost+4.pem'))
}

// Start Next.js standalone server on port 3000
const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js')
const nextProcess = spawn('node', [standaloneServer], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production', PORT: NEXT_PORT }
})

nextProcess.on('error', (err) => {
  console.error('Failed to start Next.js:', err)
  process.exit(1)
})

nextProcess.on('exit', (code) => {
  console.log(`Next.js exited with code ${code}`)
  process.exit(code)
})

// Proxy function
function proxyRequest(req, res) {
  const options = {
    hostname: 'localhost',
    port: NEXT_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      'x-forwarded-proto': 'https',
      'x-forwarded-host': req.headers.host,
      'host': req.headers.host
    }
  }

  const proxyReq = http.request(options, (proxyRes) => {
    // Copy all headers except hop-by-hop headers
    const hopByHop = ['connection', 'keep-alive', 'transfer-encoding', 'te', 'trailer', 'upgrade']
    const headers = {}
    for (const key in proxyRes.headers) {
      if (!hopByHop.includes(key.toLowerCase())) {
        headers[key] = proxyRes.headers[key]
      }
    }
    res.writeHead(proxyRes.statusCode, headers)
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Proxy Error')
    }
  })

  req.pipe(proxyReq)
}

// Create HTTPS proxy server
const server = https.createServer(sslOptions, proxyRequest)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🚀 SIAME 2026 - HTTPS Server (Production)                       ║
║                                                                   ║
║   ✓ HTTPS habilitado con certificado válido                       ║
║                                                                   ║
║   URLs de acceso:                                                  ║
║   ─────────────────────────────────────────────────────────────────  ║
║   • https://localhost                                             ║
║   • https://127.0.0.1                                              ║
║   • https://siame2026.local  (edita hosts)                         ║
║   • https://172.18.28.84                                           ║
║                                                                   ║
║   Para agregar siame2026.local, edita:                            ║
║   • Windows: C:\\Windows\\System32\\drivers\\etc\\hosts            ║
║   • Agrega: 172.18.28.84  siame2026.local                          ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════════╝
  `)
})

// Graceful shutdown
const shutdown = () => {
  console.log('\\nShutting down gracefully...')
  nextProcess.kill('SIGTERM')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
