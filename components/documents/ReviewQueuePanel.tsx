"use client"

import { useCallback, useDeferredValue, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { DocumentListItemDto, DocumentsListResponseDto } from "@/modules/documentos/application/dto"

type ReviewQueueItem = Omit<DocumentListItemDto, "createdAt" | "analyzedAt"> & {
  createdAt: string
  analyzedAt: string | null
}

interface PaginatedResponse extends Omit<DocumentsListResponseDto, "documents"> {
  documents: ReviewQueueItem[]
}

interface ReviewQueuePanelProps {
  initialSearch?: string
  initialReviewFilter?: "all" | "pending" | "confirmed" | "rejected"
  initialTypeFilter?: "all" | "guia_valija" | "hoja_remision" | "oficio"
  initialPage?: number
  onStateChange?: (state: {
    search: string
    reviewFilter: "all" | "pending" | "confirmed" | "rejected"
    typeFilter: "all" | "guia_valija" | "hoja_remision" | "oficio"
    page: number
  }) => void
  onReviewStatusChange?: (change: {
    documentId: string
    from: "pending" | "confirmed" | "rejected"
    to: "confirmed" | "rejected"
  }) => void
}

export function transitionReviewQueueRows(
  rows: ReviewQueueItem[],
  documentId: string,
  to: "confirmed" | "rejected",
  reviewFilter: "all" | "pending" | "confirmed" | "rejected"
): ReviewQueueItem[] {
  return rows
    .map((doc) => (doc.id === documentId ? { ...doc, reviewStatus: to } : doc))
    .filter((doc) => {
      if (reviewFilter === "all") return true
      return (doc.reviewStatus || "pending") === reviewFilter
    })
}

export function ReviewQueuePanel({
  initialSearch = "",
  initialReviewFilter = "pending",
  initialTypeFilter = "all",
  initialPage = 1,
  onStateChange,
  onReviewStatusChange,
}: ReviewQueuePanelProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<ReviewQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState(initialSearch)
  const [reviewFilter, setReviewFilter] = useState<"all" | "pending" | "confirmed" | "rejected">(initialReviewFilter)
  const [typeFilter, setTypeFilter] = useState<"all" | "guia_valija" | "hoja_remision" | "oficio">(initialTypeFilter)
  const [actionLoadingById, setActionLoadingById] = useState<Record<string, "confirm" | "reject" | null>>({})
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("Rechazado desde cola de revisión")
  const deferredSearch = useDeferredValue(search)

  const fetchDocuments = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "8",
      })
      if (deferredSearch) params.append("search", deferredSearch)
      if (reviewFilter !== "all") params.append("reviewStatus", reviewFilter)
      if (typeFilter !== "all") params.append("documentType", typeFilter)

      const response = await fetch(`/api/documents?${params}`, { signal })
      if (!response.ok) throw new Error("Failed to fetch review queue")
      const data: PaginatedResponse = await response.json()
      setDocuments(data.documents)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      toast.error("No se pudo cargar la cola de revisión")
    } finally {
      setLoading(false)
    }
  }, [deferredSearch, page, reviewFilter, typeFilter])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => fetchDocuments(controller.signal), 200)
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [fetchDocuments])

  useEffect(() => {
    onStateChange?.({
      search,
      reviewFilter,
      typeFilter,
      page,
    })
  }, [onStateChange, page, reviewFilter, search, typeFilter])

  const setActionLoading = (id: string, action: "confirm" | "reject" | null) => {
    setActionLoadingById((prev) => ({ ...prev, [id]: action }))
  }

  const applyOptimisticRowTransition = (
    documentId: string,
    to: "confirmed" | "rejected"
  ) => {
    setDocuments((prev) => transitionReviewQueueRows(prev, documentId, to, reviewFilter))
  }

  const normalizeReviewStatus = (status: string | null | undefined): "pending" | "confirmed" | "rejected" => {
    if (status === "confirmed" || status === "rejected") return status
    return "pending"
  }

  const closeRejectDialog = () => {
    setRejectTargetId(null)
    setRejectReason("Rechazado desde cola de revisión")
  }

  const handleQuickConfirm = async (documentId: string, from: "pending" | "confirmed" | "rejected") => {
    try {
      setActionLoading(documentId, "confirm")
      const response = await fetch("/api/analyze/document-type/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "No se pudo confirmar")
      }
      applyOptimisticRowTransition(documentId, "confirmed")
      toast.success("Documento confirmado")
      onReviewStatusChange?.({
        documentId,
        from,
        to: "confirmed",
      })
      fetchDocuments()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al confirmar")
      return false
    } finally {
      setActionLoading(documentId, null)
    }
  }

  const handleQuickReject = async (
    documentId: string,
    reason: string,
    from: "pending" | "confirmed" | "rejected"
  ) => {
    try {
      setActionLoading(documentId, "reject")
      const response = await fetch("/api/analyze/document-type/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          reason,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "No se pudo rechazar")
      }
      applyOptimisticRowTransition(documentId, "rejected")
      toast.success("Documento rechazado")
      onReviewStatusChange?.({
        documentId,
        from,
        to: "rejected",
      })
      fetchDocuments()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al rechazar")
      return false
    } finally {
      setActionLoading(documentId, null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      <div className="rounded-xl border border-[var(--kt-gray-200)] bg-white p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-[var(--kt-text-dark)]">Cola de Revisión</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar..."
              className="rounded-md border px-3 py-2 text-sm"
            />
            <select
              value={reviewFilter}
              onChange={(e) => {
                setReviewFilter(e.target.value as typeof reviewFilter)
                setPage(1)
              }}
              className="rounded-md border px-3 py-2 text-sm bg-white"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmado</option>
              <option value="rejected">Rechazado</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as typeof typeFilter)
                setPage(1)
              }}
              className="rounded-md border px-3 py-2 text-sm bg-white"
            >
              <option value="all">Todos los tipos</option>
              <option value="guia_valija">Guía Valija</option>
              <option value="hoja_remision">Hoja Remisión</option>
              <option value="oficio">Oficio</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--kt-text-muted)]">Cargando...</div>
        ) : documents.length === 0 ? (
          <div className="py-8 text-center text-sm text-[var(--kt-text-muted)]">No hay documentos para los filtros seleccionados.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-[var(--kt-gray-50)]">
                <tr>
                  <th className="px-3 py-2 text-left">Documento</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Analizado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const actionState = actionLoadingById[doc.id] || null
                  const normalizedStatus = normalizeReviewStatus(doc.reviewStatus)
                  const canConfirm = normalizedStatus !== "confirmed"
                  const canReject = normalizedStatus !== "rejected"
                  return (
                    <tr key={doc.id} className="border-b">
                      <td className="px-3 py-2">
                        <div className="font-medium">{doc.fileName}</div>
                        <div className="text-xs text-[var(--kt-text-muted)]">{(doc.fileSize / 1024).toFixed(1)} KB</div>
                      </td>
                      <td className="px-3 py-2">{doc.detectedDocumentType?.replace("_", " ") || "N/A"}</td>
                      <td className="px-3 py-2">{doc.reviewStatus || "pending"}</td>
                      <td className="px-3 py-2">{formatDate(doc.analyzedAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => router.push(`/verify?documentId=${doc.id}`)}>
                            Verificar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleQuickConfirm(doc.id, normalizedStatus)}
                            disabled={actionState !== null || !canConfirm}
                          >
                            {actionState === "confirm" ? "Confirmando..." : canConfirm ? "Confirmar" : "Confirmado"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectTargetId(doc.id)}
                            disabled={actionState !== null || !canReject}
                          >
                            {actionState === "reject" ? "Rechazando..." : canReject ? "Rechazar" : "Rechazado"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span>
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Anterior
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!rejectTargetId} onOpenChange={(open) => !open && closeRejectDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Documento</DialogTitle>
            <DialogDescription>
              Registra el motivo del rechazo para la auditoría del flujo de revisión.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="queue-reject-reason" className="text-sm font-medium">
              Motivo
            </label>
            <Textarea
              id="queue-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Describe por qué se rechaza este análisis"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRejectDialog}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!rejectTargetId) return
                const reason = rejectReason.trim()
                if (!reason) {
                  toast.error("Debes ingresar un motivo de rechazo")
                  return
                }
                const targetDoc = documents.find((doc) => doc.id === rejectTargetId)
                const didReject = await handleQuickReject(
                  rejectTargetId,
                  reason,
                  normalizeReviewStatus(targetDoc?.reviewStatus)
                )
                if (didReject) {
                  closeRejectDialog()
                }
              }}
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
