/**
 * HTTPS Server for SIAME 2026
 * Runs Next.js on port 3000 behind an HTTPS proxy on port 443
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const HTTPS_PORT = 443
const HTTP_PORT = 80
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

// Proxy function for HTTP (adds x-forwarded-proto: http)
function proxyRequestHttp(req, res) {
  const options = {
    hostname: 'localhost',
    port: NEXT_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      'x-forwarded-proto': 'http',
      'x-forwarded-host': req.headers.host,
      'host': req.headers.host
    }
  }

  const proxyReq = http.request(options, (proxyRes) => {
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
    console.error('HTTP Proxy error:', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Proxy Error')
    }
  })

  req.pipe(proxyReq)
}

// Create HTTPS proxy server
const httpsServer = https.createServer(sslOptions, proxyRequest)

httpsServer.on('error', (err) => {
  failStartup(`No se pudo abrir el puerto HTTPS ${HTTPS_PORT}`, err)
})

// Create HTTP proxy server
const httpServer = http.createServer(proxyRequestHttp)

httpServer.on('error', (err) => {
  console.error(`[HTTP Server] Error: ${err.message}`)
})

waitForNextServer()
  .then(() => {
    // Start HTTPS server
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      serverStarted = true
    })

    // Start HTTP server
    httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🚀 SIAME 2026 - HTTP + HTTPS Server (Production)                ║
║                                                                   ║
║   ✓ HTTP habilitado en puerto 80                                  ║
║   ✓ HTTPS habilitado con certificado para siame2026.local        ║
║                                                                   ║
║   URLs de acceso:                                                  ║
║   ─────────────────────────────────────────────────────────────────  ║
║   • http://172.18.28.84                                            ║
║   • http://siame2026.local                                         ║
║   • https://siame2026.local                                        ║
║   • https://172.18.28.84                                           ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════════╝
  `)
    })
  })
  .catch((err) => {
    failStartup('Next.js no quedó listo; el proxy no se iniciará', err)
  })

// Graceful shutdown
const shutdown = () => {
  console.log('\\nShutting down gracefully...')
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill('SIGTERM')
  }
  httpsServer.close(() => {
    httpServer.close(() => {
      console.log('Servers closed')
      process.exit(0)
    })
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
