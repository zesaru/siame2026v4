import { describe, it, expect } from 'vitest'
import { extractNumeroGuia, parseFecha } from './guias-valija-parser'

describe('guias-valija-parser', () => {
  describe('extractNumeroGuia', () => {
    it('debería extraer número de guía con formato Nº XX', () => {
      const text = 'GUÍA DE VALIJA DIPLOMÁTICA Nº 24 ENTRADA'
      const result = extractNumeroGuia(text)
      expect(result).toBe('24')
    })

    it('debería extraer número de guía de 1 dígito', () => {
      const text = 'GUÍA DE VALIJA DIPLOMÁTICA Nº 5 ENTRADA'
      const result = extractNumeroGuia(text)
      expect(result).toBe('5')
    })

    it('debería extraer número de guía de 2 dígitos', () => {
      const text = 'Nº 12 - GUÍA DE VALIJA'
      const result = extractNumeroGuia(text)
      expect(result).toBe('12')
    })

    it('debería devolver string vacío si no encuentra patrón', () => {
      const text = 'SIN NÚMERO DE GUÍA'
      const result = extractNumeroGuia(text)
      expect(result).toBe('')
    })

    it('debería devolver string vacío para texto vacío', () => {
      const result = extractNumeroGuia('')
      expect(result).toBe('')
    })
  })

  describe('parseFecha', () => {
    it('debería parsear fecha en formato DD/MM/YYYY', () => {
      const fecha = '19/12/2025'
      const result = parseFecha(fecha)
      expect(result).not.toBeNull()
      expect(result?.toISOString()).toContain('2025-12-19')
    })

    it('debería parsear fecha con día y mes de 1 dígito', () => {
      const fecha = '1/2/2025'
      const result = parseFecha(fecha)
      expect(result).not.toBeNull()
      expect(result?.toISOString()).toContain('2025-02-01')
    })

    it('debería devolver null para fecha inválida', () => {
      const fecha = '32/13/2025'
      const result = parseFecha(fecha)
      expect(result).toBeNull()
    })

    it('debería devolver null para string vacío', () => {
      const result = parseFecha('')
      expect(result).toBeNull()
    })

    it('debería limpiar caracteres problemáticos de OCR', () => {
      const text = '19(/12/2025' // Paréntesis mal escaneados
      const result = parseFecha(text)
      expect(result).not.toBeNull()
      expect(result?.toISOString()).toContain('2025-12-19')
    })

    it('debería limpiar espacios extras', () => {
      const fecha = '  19  /  12  /  2025  '
      const result = parseFecha(fecha)
      expect(result).not.toBeNull()
    })
  })
})
