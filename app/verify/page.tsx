"use client"

import { Suspense } from "react"
import VerifyDocumentContent from "./verify-client"

export default function VerifyDocumentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--kt-text-muted)]">Cargando...</p>
        </div>
      </div>
    }>
      <VerifyDocumentContent />
    </Suspense>
  )
}
