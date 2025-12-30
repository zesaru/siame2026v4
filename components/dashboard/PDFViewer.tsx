"use client"

import { useEffect, useRef, useState } from "react"

interface PDFViewerProps {
  file: File | null
}

export default function PDFViewer({ file }: PDFViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Crear URL del objeto cuando cambie el archivo
    if (file) {
      const url = URL.createObjectURL(file)
      setObjectUrl(url)
      setError(null)

      // Limpiar URL al desmontar
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setObjectUrl(null)
    }
  }, [file])

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center border-2 border-dashed border-[var(--kt-gray-300)] rounded-lg bg-[var(--kt-gray-50)]">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-[var(--kt-text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-[var(--kt-text-muted)]">
            Sube un PDF para ver el preview
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center border-2 border-[var(--kt-danger)] rounded-lg bg-[var(--kt-danger-light)]">
        <div className="text-center">
          <p className="text-[var(--kt-danger)] font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full border border-[var(--kt-gray-200)] rounded-lg overflow-hidden">
      {objectUrl ? (
        <iframe
          src={objectUrl}
          className="w-full h-full"
          title="PDF Preview"
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
