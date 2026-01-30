import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { documentQuerySchema, documentSchema } from './document'

// Nota: documentQuerySchema transforma strings a números, por lo que page/limit serán números

describe('Document Schema Validation', () => {
  describe('documentQuerySchema', () => {
    it('debería validar query params correctos', () => {
      const result = documentQuerySchema.parse({
        page: '1',
        limit: '10',
        search: 'test'
      })

      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.search).toBe('test')
    })

    it('debería usar valores por defecto', () => {
      const result = documentQuerySchema.parse({})

      // Los valores se transforman de string a número por el schema
      expect(typeof result.page).toBe('number')
      expect(result.page).toBeGreaterThanOrEqual(1)
      expect(typeof result.limit).toBe('number')
      expect(result.limit).toBeLessThanOrEqual(100)
      expect(result.search).toBeUndefined()
    })

    it('debería transformar strings a números', () => {
      const result = documentQuerySchema.parse({
        page: '5',
        limit: '20'
      })

      expect(result.page).toBe(5)
      expect(result.limit).toBe(20)
    })

    it('debería rechazar page negativo', () => {
      expect(() => {
        documentQuerySchema.parse({ page: '-1' })
      }).toThrow()
    })

    it('debería rechazar limit mayor a 100', () => {
      expect(() => {
        documentQuerySchema.parse({ limit: '101' })
      }).toThrow()
    })

    it('debería rechazar search mayor a 200 caracteres', () => {
      const longSearch = 'a'.repeat(201)
      expect(() => {
        documentQuerySchema.parse({ search: longSearch })
      }).toThrow()
    })
  })

  describe('documentSchema', () => {
    const validDocument = {
      fileName: 'test.pdf',
      fileSize: 1024,
      fileType: 'application/pdf',
      fileExtension: 'pdf',
    }

    it('debería validar documento correcto', () => {
      const result = documentSchema.parse(validDocument)
      expect(result.fileName).toBe('test.pdf')
      expect(result.fileSize).toBe(1024)
    })

    it('debería requerir fileName', () => {
      const invalidDoc = { ...validDocument, fileName: '' }
      expect(() => {
        documentSchema.parse(invalidDoc)
      }).toThrow()
    })

    it('debería rechazar fileSize negativo', () => {
      const invalidDoc = { ...validDocument, fileSize: -100 }
      expect(() => {
        documentSchema.parse(invalidDoc)
      }).toThrow()
    })

    it('debería aceptar processingStatus opcional con default', () => {
      const result = documentSchema.parse(validDocument)
      expect(result.processingStatus).toBe('pending')
    })

    it('debería rechazar processingStatus inválido', () => {
      const invalidDoc = { ...validDocument, processingStatus: 'invalid' }
      expect(() => {
        documentSchema.parse(invalidDoc)
      }).toThrow()
    })
  })
})
