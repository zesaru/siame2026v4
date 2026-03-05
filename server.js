/**
 * server.js - Punto de entrada para iisnode (IIS en Windows Server)
 *
 * Este archivo permite hospedar Next.js en IIS usando el módulo iisnode.
 * Configura un servidor HTTP personalizado que maneja las solicitudes
 * de Next.js en modo producción.
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Configuración de producción
const dev = false;
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 3000;

// Crear instancia de Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Parsear la URL y manejar la solicitud con Next.js
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> SIAME 2026 ready on http://${hostname}:${port}`);
    });
});
