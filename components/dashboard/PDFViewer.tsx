"use client"

import { useEffect, useState } from "react"

interface PDFViewerProps {
  file: File | null
  src?: string | null
  emptyMessage?: string
  missingMessage?: string
  onAvailabilityChange?: (available: boolean) => void
}

export default function PDFViewer({
  file,
  src,
  emptyMessage = "Sube un PDF para ver el preview",
  missingMessage = "Archivo no disponible en almacenamiento",
  onAvailabilityChange,
}: PDFViewerProps) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(src ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (file) {
      const url = URL.createObjectURL(file)
      setViewerUrl(url)
      setError(null)
       setIsChecking(false)
      onAvailabilityChange?.(true)

      return () => {
        URL.revokeObjectURL(url)
      }
    }

    if (!src) {
      setViewerUrl(null)
      setError(null)
      setIsChecking(false)
      onAvailabilityChange?.(false)
      return
    }

    const verifySource = async () => {
      setIsChecking(true)
      setError(null)

      try {
        const response = await fetch(src, {
          method: "HEAD",
          cache: "no-store",
          credentials: "same-origin",
        })

        if (!response.ok) {
          throw new Error(missingMessage)
        }

        if (!cancelled) {
          setViewerUrl(src)
          onAvailabilityChange?.(true)
        }
      } catch {
        if (!cancelled) {
          setViewerUrl(null)
          setError(missingMessage)
          onAvailabilityChange?.(false)
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false)
        }
      }
    }

    setViewerUrl(null)
    void verifySource()

    return () => {
      cancelled = true
    }
  }, [file, src, missingMessage, onAvailabilityChange])

  if (!file && !src) {
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
            {emptyMessage}
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
      {isChecking ? (
        <div className="h-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : viewerUrl ? (
        <iframe
          src={viewerUrl}
          className="w-full h-full"
          title="Vista previa PDF"
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
