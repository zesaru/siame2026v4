/**
 * Sistema de Logging con colores para el servidor
 */

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
}

const icons = {
  info: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '❌',
  debug: '🔍',
  azure: '🤖',
  database: '💾',
  document: '📄',
  storage: '📁',
}

class Logger {
  private formatMessage(level: LogLevel, message: string, color: string): string {
    const timestamp = new Date().toISOString()
    const icon = icons[level] || icons.info
    return `${color}[${timestamp}] ${icon} ${message}${colors.reset}`
  }

  info(message: string) {
    console.log(this.formatMessage('info', message, colors.blue))
  }

  success(message: string) {
    console.log(this.formatMessage('success', message, colors.green))
  }

  warn(message: string) {
    console.warn(this.formatMessage('warn', message, colors.yellow))
  }

  error(message: string, error?: any) {
    console.error(this.formatMessage('error', message, colors.red))
    if (error) {
      console.error(`${colors.red}${error}${colors.reset}`)
      if (error.stack) {
        console.error(`${colors.dim}${error.stack}${colors.reset}`)
      }
    }
  }

  debug(message: string) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, colors.dim))
    }
  }

  // Log específicos para Azure
  azureRequest(fileName: string, fileSize: number) {
    console.log(`\n${colors.bright}${colors.cyan}${icons.azure} AZURE DOCUMENT INTELLIGENCE - REQUEST${colors.reset}`)
    console.log(`${colors.cyan}┌─────────────────────────────────────────────────────${colors.reset}`)
    console.log(`${colors.cyan}│${colors.reset} 📄 File:        ${fileName}`)
    console.log(`${colors.cyan}│${colors.reset} 📦 Size:        ${(fileSize / 1024).toFixed(2)} KB`)
    console.log(`${colors.cyan}│${colors.reset} ⏰ Time:        ${new Date().toLocaleString()}`)
    console.log(`${colors.cyan}└─────────────────────────────────────────────────────${colors.reset}\n`)
  }

  azureResponse(result: any, duration: number) {
    console.log(`\n${colors.bright}${colors.green}${icons.azure} AZURE DOCUMENT INTELLIGENCE - RESPONSE${colors.reset}`)
    console.log(`${colors.green}┌─────────────────────────────────────────────────────${colors.reset}`)
    console.log(`${colors.green}│${colors.reset} ⏱️  Duration:    ${duration}ms`)
    console.log(`${colors.green}│${colors.reset} 📊 Status:      Success`)
    console.log(`${colors.green}│${colors.reset} 📝 Content:     ${result.content?.length || 0} chars`)
    console.log(`${colors.green}│${colors.reset} 🔑 Keys:        ${result.keyValuePairs?.length || 0}`)
    console.log(`${colors.green}│${colors.reset} 📋 Tables:      ${result.tables?.length || 0}`)
    console.log(`${colors.green}│${colors.reset} 👥 Entities:    ${result.entities?.length || 0}`)
    console.log(`${colors.green}└─────────────────────────────────────────────────────${colors.reset}\n`)
  }

  azureKeyValuePairs(pairs: any[]) {
    console.log(`\n${colors.bright}${colors.magenta}${icons.azure} AZURE - KEY-VALUE PAIRS (${pairs?.length || 0})${colors.reset}`)
    console.log(`${colors.magenta}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`)

    if (!pairs || pairs.length === 0) {
      console.log(`${colors.yellow}⚠️  No key-value pairs found${colors.reset}`)
    } else {
      pairs.forEach((pair, index) => {
        const key = pair.key || '(empty)'
        const value = pair.value || '(empty)'
        const confidence = pair.confidence ? `${Math.round(pair.confidence * 100)}%` : 'N/A'

        console.log(`${colors.magenta}║${colors.reset} ${colors.bright}${index + 1}. Key:${colors.reset} "${key}"`)
        console.log(`${colors.magenta}║${colors.reset}    Value: "${value.substring(0, 80)}${value.length > 80 ? '...' : ''}"`)
        console.log(`${colors.magenta}║${colors.reset}    Confidence: ${confidence}`)

        if (index < pairs.length - 1) {
          console.log(`${colors.magenta}║${colors.reset} ${colors.dim}───────────────────────────────────────────────────────────${colors.reset}`)
        }
      })
    }

    console.log(`${colors.magenta}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`)
  }

  azureTables(tables: any[]) {
    console.log(`\n${colors.bright}${colors.cyan}${icons.azure} AZURE - TABLES (${tables?.length || 0})${colors.reset}`)
    console.log(`${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`)

    if (!tables || tables.length === 0) {
      console.log(`${colors.yellow}⚠️  No tables found${colors.reset}`)
    } else {
      tables.forEach((table, index) => {
        const rows = table.rowCount || 0
        const cols = table.columnCount || 0
        const cells = table.cells?.length || 0

        console.log(`${colors.cyan}║${colors.reset} ${colors.bright}Table ${index + 1}:${colors.reset}`)
        console.log(`${colors.cyan}║${colors.reset}    Dimensions: ${rows} rows × ${cols} cols`)
        console.log(`${colors.cyan}║${colors.reset}    Total Cells: ${cells}`)

        if (index < tables.length - 1) {
          console.log(`${colors.cyan}║${colors.reset} ${colors.dim}───────────────────────────────────────────────────────────${colors.reset}`)
        }
      })
    }

    console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}\n`)
  }

  // Log específico para extracción de número de guía
  guiaExtraction(fieldName: string, rawValue: string, extractedValue: string) {
    console.log(`${colors.bright}${colors.yellow}🔍 GUÍA EXTRACTION - ${fieldName}${colors.reset}`)
    console.log(`${colors.yellow}  Raw Value:    "${rawValue}"${colors.reset}`)
    console.log(`${colors.yellow}  Extracted:     "${extractedValue}"${colors.reset}\n`)
  }

  // Log para operaciones de base de datos
  database(operation: string, details: string) {
    console.log(`${colors.green}${icons.database} DB [${operation}]: ${details}${colors.reset}`)
  }

  // Log para documentos
  document(operation: string, fileName: string, details?: string) {
    const msg = details ? `${icons.document} ${operation} - ${fileName}: ${details}` : `${icons.document} ${operation} - ${fileName}`
    console.log(`${colors.blue}${msg}${colors.reset}`)
  }

  // Log para operaciones de almacenamiento de archivos
  storage(operation: string, details: string) {
    console.log(`${colors.magenta}${icons.storage} STORAGE [${operation}]: ${details}${colors.reset}`)
  }

  // Separator visual
  separator(char: string = '═', length: number = 60) {
    console.log(colors.dim + char.repeat(length) + colors.reset)
  }
}

export const logger = new Logger()
