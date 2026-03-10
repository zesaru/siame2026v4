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
const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js')
let serverStarted = false

function failStartup(message, error) {
  console.error(`[HTTPS Server] ${message}`)
  if (error) {
    console.error(error)
  }
  process.exit(1)
}

function ensureFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    failStartup(`${description} no encontrado: ${filePath}`)
  }
}

ensureFileExists(path.join(certPath, 'siame2026.local+2-key.pem'), 'Clave TLS')
ensureFileExists(path.join(certPath, 'siame2026.local+2.pem'), 'Certificado TLS')
ensureFileExists(standaloneServer, 'Servidor standalone de Next.js')

const sslOptions = {
  key: fs.readFileSync(path.join(certPath, 'siame2026.local+2-key.pem')),
  cert: fs.readFileSync(path.join(certPath, 'siame2026.local+2.pem'))
}

// Start Next.js standalone server on port 3000
const nextProcess = spawn('node', [standaloneServer], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production', PORT: NEXT_PORT }
})

nextProcess.on('error', (err) => {
  failStartup('No se pudo iniciar Next.js standalone', err)
})

nextProcess.on('exit', (code) => {
  if (!serverStarted) {
    failStartup(`Next.js terminó antes de que el proxy HTTPS quedara listo. Código: ${code}`)
  }
  console.log(`Next.js exited with code ${code}`)
  process.exit(code || 0)
})

function waitForNextServer(timeoutMs = 15000) {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: NEXT_PORT,
          path: '/auth/signin',
          method: 'HEAD',
          timeout: 2000,
        },
        () => {
          resolve()
        }
      )

      req.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Next.js no respondió en puerto ${NEXT_PORT} dentro de ${timeoutMs}ms`))
          return
        }
        setTimeout(check, 300)
      })

      req.on('timeout', () => {
        req.destroy()
      })

      req.end()
    }

    check()
  })
}

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

server.on('error', (err) => {
  failStartup(`No se pudo abrir el puerto HTTPS ${PORT}`, err)
})

waitForNextServer()
  .then(() => {
    server.listen(PORT, '0.0.0.0', () => {
      serverStarted = true
      console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🚀 SIAME 2026 - HTTPS Server (Production)                       ║
║                                                                   ║
║   ✓ HTTPS habilitado con certificado para siame2026.local        ║
║                                                                   ║
║   URL oficial de acceso:                                           ║
║   ─────────────────────────────────────────────────────────────────  ║
║   • https://siame2026.local                                        ║
║                                                                   ║
║   URLs alternativas (solo mantenimiento):                          ║
║   ─────────────────────────────────────────────────────────────────  ║
║   • https://localhost                                             ║
║   • https://172.18.28.84                                           ║
║                                                                   ║
║   Configuración de clientes:                                       ║
║   ─────────────────────────────────────────────────────────────────  ║
║   1. Instalar CA: C:\\inetpub\\siame2026\\certs\\siame2026-root-ca.cer   ║
║   2. Editar hosts: C:\\Windows\\System32\\drivers\\etc\\hosts            ║
║      Agregar: 172.18.28.84  siame2026.local                         ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════════╝
  `)
    })
  })
  .catch((err) => {
    failStartup('Next.js no quedó listo; el proxy HTTPS no se iniciará', err)
  })

// Graceful shutdown
const shutdown = () => {
  console.log('\\nShutting down gracefully...')
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill('SIGTERM')
  }
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
