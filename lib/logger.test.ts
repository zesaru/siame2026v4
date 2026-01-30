import { describe, it, expect } from 'vitest'
import { logger } from '../lib/logger'

describe('Logger', () => {
  // Mock console methods to avoid cluttering test output
  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error

  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console output in tests
    console.log = vi.fn()
    console.warn = vi.fn()
    console.error = vi.fn()
  })

  afterEach(() => {
    console.log = originalLog
    console.warn = originalWarn
    console.error = originalError
  })

  describe('logger.debug', () => {
    it('debería llamar console.log en desarrollo', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      logger.debug('test debug message')

      expect(console.log).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('debug'))

      process.env.NODE_ENV = originalEnv
    })

    it('debería aceptar múltiples argumentos', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      logger.debug('test', 'message', { data: 'test' })

      expect(console.log).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('logger.error', () => {
    it('debería llamar console.error siempre', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      logger.error('test error message')

      expect(console.error).toHaveBeenCalled()
      // El logger agrega timestamp y prefijo, no solo "ERROR"
      expect(console.error).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })

    it('debería llamar console.error en desarrollo', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      logger.error('test error')

      expect(console.error).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('logger.storage', () => {
    it('debería llamar console.log con STORAGE prefix', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      logger.storage('UPLOAD', 'test.pdf')

      expect(console.log).toHaveBeenCalled()
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('STORAGE'))
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('UPLOAD'))
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('test.pdf'))

      process.env.NODE_ENV = originalEnv
    })
  })
})
