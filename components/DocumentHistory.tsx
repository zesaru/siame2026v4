"use client"

import { useCallback, useDeferredValue, useEffect, useState } from "react"
import { logger } from "@/lib/logger"
import type { DocumentListItemDto, DocumentsListResponseDto } from "@/modules/documentos/application/dto"

export type DocumentHistoryItem = Omit<DocumentListItemDto, "createdAt" | "analyzedAt"> & {
  createdAt: string
  analyzedAt: string | null
}

interface PaginatedResponse extends Omit<DocumentsListResponseDto, "documents"> {
  documents: DocumentHistoryItem[]
}

interface DocumentHistoryProps {
  onSelectDocument: (document: DocumentHistoryItem) => void
  onReviewDocument?: (document: DocumentHistoryItem) => void
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
  onClose: () => void
}

export default function DocumentHistory({
  onSelectDocument,
  onReviewDocument,
  initialSearch = "",
  initialReviewFilter = "all",
  initialTypeFilter = "all",
  initialPage = 1,
  onStateChange,
  onClose
}: DocumentHistoryProps) {
  const [documents, setDocuments] = useState<DocumentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState(initialSearch)
  const [reviewFilter, setReviewFilter] = useState<"all" | "pending" | "confirmed" | "rejected">(initialReviewFilter)
  const [typeFilter, setTypeFilter] = useState<"all" | "guia_valija" | "hoja_remision" | "oficio">(initialTypeFilter)
  const deferredSearch = useDeferredValue(search)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      })
      if (deferredSearch) {
        params.append("search", deferredSearch)
      }
      if (reviewFilter !== "all") {
        params.append("reviewStatus", reviewFilter)
      }
      if (typeFilter !== "all") {
        params.append("documentType", typeFilter)
      }

      const response = await fetch(`/api/documents?${params}`, { signal })
      if (!response.ok) throw new Error("Failed to fetch documents")

      const data: PaginatedResponse = await response.json()
      setDocuments(data.documents)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return
      }
      logger.error("Error fetching documents:", error)
    } finally {
      setLoading(false)
    }
  }, [page, deferredSearch, reviewFilter, typeFilter])

  const deleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      setDeletingId(id)
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete document")

      // Refresh the list
      fetchDocuments()
    } catch (error) {
      logger.error("Error deleting document:", error)
      alert("Failed to delete document")
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      fetchDocuments(controller.signal)
    }, 200)

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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleString()
  }

  const reviewStatusLabel = (status: string | null | undefined) => {
    if (status === "confirmed") return "Confirmado"
    if (status === "rejected") return "Rechazado"
    return "Pendiente"
  }

  const reviewStatusClass = (status: string | null | undefined) => {
    if (status === "confirmed") return "bg-green-100 text-green-700"
    if (status === "rejected") return "bg-red-100 text-red-700"
    return "bg-yellow-100 text-yellow-700"
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Document History</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={reviewFilter}
                onChange={(e) => {
                  setReviewFilter(e.target.value as typeof reviewFilter)
                  setPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="all">Todos los tipos</option>
                <option value="guia_valija">Guía Valija</option>
                <option value="hoja_remision">Hoja Remisión</option>
                <option value="oficio">Oficio</option>
              </select>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="overflow-auto" style={{ maxHeight: "calc(80vh - 200px)" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">No documents found</div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Extracted Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Review
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded flex items-center justify-center">
                          <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{doc.fileName}</div>
                          <div className="text-sm text-gray-500">{formatFileSize(doc.fileSize)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {doc.tableCount} tables, {doc.keyValueCount} key-values
                      </div>
                      <div className="text-sm text-gray-500">{doc.entityCount} entities</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(doc.analyzedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${reviewStatusClass(doc.reviewStatus)}`}>
                        {reviewStatusLabel(doc.reviewStatus)}
                      </span>
                      {doc.detectedDocumentType && (
                        <div className="mt-1 text-xs text-gray-500">{doc.detectedDocumentType.replace("_", " ")}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => onSelectDocument(doc)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                      {(doc.reviewStatus !== "confirmed" || doc.processingStatus === "pending_review") && onReviewDocument && (
                        <button
                          onClick={() => onReviewDocument(doc)}
                          className="text-amber-600 hover:text-amber-900 mr-4"
                        >
                          Verificar
                        </button>
                      )}
                      <button
                        onClick={() => deleteDocument(doc.id)}
                        disabled={deletingId === doc.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === doc.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
