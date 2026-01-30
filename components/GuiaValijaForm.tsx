"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { logger } from "@/lib/logger"

interface KeyValuePair {
  key: string
  value: string
  confidence?: number
}

interface GuiaValijaFormProps {
  editedPairs: KeyValuePair[]
  onFieldChange: (index: number, field: 'key' | 'value', newValue: string) => void
}

/**
 * Extrae el número de guía del campo "DE"
 */
function extractNumeroGuia(text: string): string {
  if (!text) return ""

  // Limpiar saltos de línea y espacios extras
  const cleanText = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim()

  // Logging en cliente-side (solo en desarrollo)
  logger.debug('🔍 [GUIA EXTRACTION] Raw text:', text)
  logger.debug('🔍 [GUIA EXTRACTION] Clean text:', cleanText)

  // 1. Nº o N° seguido de número (1-2 dígitos)
  let match = cleanText.match(/N[º°]\s*(\d{1,2})/i)
  if (match) {
    logger.debug('✅ [GUIA EXTRACTION] Pattern 1 matched:', match[1])
    return match[1]
  }

  // 2. "GUÍA DE VALIJA DIPLOMÁTICA" seguido de Nº y número
  match = cleanText.match(/GUÍA\s+DE\s+VALIJA\s+DIPLOM[ÁA]TICA\s+N[º°]\s*(\d{1,2})/i)
  if (match) {
    logger.debug('✅ [GUIA EXTRACTION] Pattern 2 matched:', match[1])
    return match[1]
  }

  // 3. Cualquier número de 1-2 dígitos después de "GUÍA"
  match = cleanText.match(/GU[ÍÍ]A[^\d]*(\d{1,2})/i)
  if (match) {
    logger.debug('✅ [GUIA EXTRACTION] Pattern 3 matched:', match[1])
    return match[1]
  }

  // 4. Buscar cualquier número de 1-2 dígitos
  match = cleanText.match(/(\d{1,2})/)
  if (match) {
    logger.debug('✅ [GUIA EXTRACTION] Pattern 4 matched:', match[1])
    return match[1]
  }

  logger.debug('❌ [GUIA EXTRACTION] No pattern matched')

  return ""
}

/**
 * Extrae solo los números de un string
 */
function extractNumericOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Campo de formulario reutilizable
 */
interface FormFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  inputMode?: "numeric" | "text"
  className?: string
}

function FormField({ label, value, onChange, placeholder, type = "text", inputMode = "text", className = "" }: FormFieldProps) {
  return (
    <div>
      <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        className={`text-sm ${className}`}
      />
    </div>
  )
}

export default function GuiaValijaForm({ editedPairs, onFieldChange }: GuiaValijaFormProps) {
  // Estado local para el número de guía (editable manualmente)
  const [numeroGuiaManual, setNumeroGuiaManual] = useState("")

  // Función auxiliar para encontrar el campo "DE" correcto
  const findDeField = () => {
    // Prioridad 1: Buscar "DE :" o "DE\n:" (con variantes de espacio/nueva línea)
    let idx = editedPairs.findIndex(p => /^DE\s*[:\n]/.test(p.key))
    if (idx !== -1) return idx

    // Prioridad 2: Buscar clave que empiece exactamente con "DE"
    idx = editedPairs.findIndex(p => p.key.trim().startsWith("DE"))
    if (idx !== -1) return idx

    // Prioridad 3: Buscar cualquier clave que contenga "DE" pero NO "DEL" ni "DESTINATARIO"
    idx = editedPairs.findIndex(p =>
      p.key.includes("DE") &&
      !p.key.includes("DEL") &&
      !p.key.includes("DESTINATARIO") &&
      !p.key.includes("DE ") &&
      p.key.length < 10
    )
    return idx
  }

  // Extraer número de guía automáticamente cuando cambian los editedPairs
  useEffect(() => {
    const deFieldIndex = findDeField()
    const deField = deFieldIndex !== -1 ? editedPairs[deFieldIndex] : null
    const extractedNumero = extractNumeroGuia(deField?.value || "")

    // Solo actualizar si el estado local está vacío y se extrajo un número
    if (extractedNumero && !numeroGuiaManual) {
      setNumeroGuiaManual(extractedNumero)
    }
  }, [editedPairs]) // Solo dependemos de editedPairs, no de numeroGuiaManual

  // Handlers para cada campo
  const handleParaChange = (newValue: string) => {
    const idx = editedPairs.findIndex(p => p.key.includes("PARA"))
    if (idx !== -1) onFieldChange(idx, 'value', newValue)
  }

  const handleNumeroGuiaChange = (newValue: string) => {
    // Permitir edición manual completa
    setNumeroGuiaManual(newValue)
  }

  const handleFechaEnvioChange = (newValue: string) => {
    const idx = editedPairs.findIndex(p => p.key.includes("ENVIO"))
    if (idx !== -1) onFieldChange(idx, 'value', newValue)
  }

  const handleFechaReciboChange = (newValue: string) => {
    const idx = editedPairs.findIndex(p => p.key.includes("RECIBO"))
    if (idx !== -1) onFieldChange(idx, 'value', newValue)
  }

  const handleTotalItemsChange = (newValue: string) => {
    const numericValue = newValue.replace(/\D/g, '')
    const idx = editedPairs.findIndex(p => p.key.includes("Items"))
    if (idx !== -1) onFieldChange(idx, 'value', numericValue)
  }

  const handlePesoOficialChange = (newValue: string) => {
    const idx = editedPairs.findIndex(p => p.key.includes("Peso Oficial"))
    if (idx !== -1) onFieldChange(idx, 'value', newValue)
  }

  // Extraer valores
  const paraValue = editedPairs.find(p => p.key.includes("PARA"))?.value || ""
  const deFieldIndex = findDeField()
  const deField = deFieldIndex !== -1 ? editedPairs[deFieldIndex] : null
  const fechaEnvioValue = editedPairs.find(p => p.key.includes("ENVIO"))?.value || ""
  const fechaReciboValue = editedPairs.find(p => p.key.includes("RECIBO"))?.value || ""
  const totalItemsValue = extractNumericOnly(editedPairs.find(p => p.key.includes("Items"))?.value || "")
  const pesoOficialValue = editedPairs.find(p => p.key.includes("Peso Oficial"))?.value || ""

  // Logging en desarrollo
  logger.debug('🔍 [GUIA FORM] Campo DE encontrado:', deField ? `index=${deFieldIndex}, key="${deField.key}"` : 'NO ENCONTRADO')
  logger.debug('🔍 [GUIA FORM] Valor del campo DE:', deField?.value)
  logger.debug('🔍 [GUIA FORM] Nº de guía extraído:', extractNumeroGuia(deField?.value || ""))
  logger.debug('🔍 [GUIA FORM] Nº de guía manual:', numeroGuiaManual)

  // Exponer el número de guía manual para que el componente padre pueda acceder
  useEffect(() => {
    // Actualizar el campo "DE" con el número manual cuando cambia
    if (numeroGuiaManual) {
      const idx = findDeField()
      if (idx !== -1 && deField) {
        // Actualizar el valor del campo DE con el número manual
        const updatedValue = deField.value.replace(/N[º°]\s*\d+/gi, `Nº${numeroGuiaManual}`)
        if (updatedValue !== deField.value) {
          onFieldChange(idx, 'value', updatedValue)
        }
      }
    }
  }, [numeroGuiaManual])

  return (
    <div className="mb-6 p-5 bg-white border-2 border-blue-500 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h4 className="text-lg font-semibold text-gray-900 m-0">
          Datos de la Guía de Valija
        </h4>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField
          label="PARA"
          value={paraValue}
          onChange={handleParaChange}
          placeholder="Destinatario"
        />

        <FormField
          label="Nº DE GUÍA"
          value={numeroGuiaManual}
          onChange={handleNumeroGuiaChange}
          placeholder="Ingrese número manualmente"
          inputMode="numeric"
          className="font-semibold text-blue-500"
        />

        <FormField
          label="FECHA DE ENVIO"
          value={fechaEnvioValue}
          onChange={handleFechaEnvioChange}
          placeholder="DD/MM/AAAA"
        />

        <FormField
          label="FECHA DE RECIBO"
          value={fechaReciboValue}
          onChange={handleFechaReciboChange}
          placeholder="DD/MM/AAAA"
        />

        <FormField
          label="TOTAL DE ITEMS"
          value={totalItemsValue}
          onChange={handleTotalItemsChange}
          placeholder="Cantidad de items"
          inputMode="numeric"
        />

        <FormField
          label="PESO OFICIAL"
          value={pesoOficialValue}
          onChange={handlePesoOficialChange}
          placeholder="Ej: 12.660 Kgrs."
        />
      </div>
    </div>
  )
}
