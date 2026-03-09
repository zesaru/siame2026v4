"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { GuiaValijaReviewPanel } from "@/components/documents/GuiaValijaReviewPanel"

type BatchItem = {
  id: string
  fileName: string
  filePath?: string | null
  analysisStatus: string
  errorMessage?: string | null
  analysisResult?: any
  guiaValijaId?: string | null
  sortOrder: number
}

type BatchResponse = {
  id: string
  status: string
  totalFiles: number
  readyCount: number
  savedCount: number
  failedCount: number
  items: BatchItem[]
}

function buildInlineFileUrl(relativePath?: string | null) {
  if (!relativePath) return ""
  return `/api/files/${relativePath}?inline=true`
}

export default function BatchGuiaValijaClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const batchIdFromUrl = searchParams?.get("batchId") || null
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [batch, setBatch] = useState<BatchResponse | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  useEffect(() => {
    if (!batchIdFromUrl) return

    const loadBatch = async () => {
      const response = await fetch(`/api/guias-valija/batches/${batchIdFromUrl}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || "No se pudo cargar el lote")
        return
      }

      setBatch(data)
      const nextPending = data.items.find((item: BatchItem) => item.analysisStatus === "ready_review")
      setActiveItemId(nextPending?.id || data.items[0]?.id || null)
    }

    void loadBatch()
  }, [batchIdFromUrl])

  const activeItem = useMemo(() => batch?.items.find((item) => item.id === activeItemId) || null, [activeItemId, batch?.items])

  const nextPendingItem = useMemo(() => {
    return batch?.items.find((item) => item.analysisStatus === "ready_review" && item.id !== activeItemId) || null
  }, [activeItemId, batch?.items])

  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).filter((file) => file.name.toLowerCase().endsWith(".pdf"))
    setFiles(selectedFiles)
  }

  const handleCreateBatch = async () => {
    if (files.length === 0) {
      toast.error("Selecciona al menos un PDF.")
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append("files", file)
      }

      const response = await fetch("/api/guias-valija/batches", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear el lote")
      }

      setBatch(data)
      const nextPending = data.items.find((item: BatchItem) => item.analysisStatus === "ready_review")
      setActiveItemId(nextPending?.id || data.items[0]?.id || null)
      router.replace(`/dashboard/guias-valija/lote?batchId=${data.id}`)
      toast.success(`Lote creado con ${data.totalFiles} archivo(s).`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el lote")
    } finally {
      setUploading(false)
    }
  }

  const handleRefreshBatch = async () => {
    if (!batch?.id) return
    const response = await fetch(`/api/guias-valija/batches/${batch.id}`, { cache: "no-store" })
    const data = await response.json()
    if (response.ok) {
      setBatch(data)
      if (!data.items.find((item: BatchItem) => item.id === activeItemId)) {
        const nextPending = data.items.find((item: BatchItem) => item.analysisStatus === "ready_review")
        setActiveItemId(nextPending?.id || data.items[0]?.id || null)
      }
    }
  }

  const handleSaveCurrentItem = async (payload: { azureResult: any; fileName: string; documentId?: string }) => {
    if (!batch || !activeItem) {
      return { error: "No hay item activo para guardar." }
    }

    const response = await fetch(`/api/guias-valija/batches/${batch.id}/items/${activeItem.id}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || "No se pudo guardar la guía del lote." }
    }

    setBatch((current) => {
      if (!current) return current
      const updatedItems = current.items.map((item) =>
        item.id === activeItem.id
          ? { ...item, analysisStatus: "saved", guiaValijaId: data.guia?.id || item.guiaValijaId, analysisResult: payload.azureResult, errorMessage: null }
          : item
      )
      const savedCount = updatedItems.filter((item) => item.analysisStatus === "saved").length
      const readyCount = updatedItems.filter((item) => item.analysisStatus === "ready_review").length
      const failedCount = updatedItems.filter((item) => item.analysisStatus === "failed").length
      return {
        ...current,
        items: updatedItems,
        savedCount,
        readyCount,
        failedCount,
        status: savedCount + failedCount === updatedItems.length ? "completed" : readyCount > 0 ? "ready_review" : current.status,
      }
    })

    return data
  }

  const moveToNextPending = () => {
    if (nextPendingItem) {
      setActiveItemId(nextPendingItem.id)
    }
  }

  const handleReanalyze = async (itemId: string) => {
    if (!batch) return
    const response = await fetch(`/api/guias-valija/batches/${batch.id}/items/${itemId}/analyze`, {
      method: "POST",
    })
    const data = await response.json()
    if (!response.ok) {
      toast.error(data.error || "No se pudo reanalizar el archivo.")
      return
    }

    setBatch((current) => {
      if (!current) return current
      const updatedItems = current.items.map((item) =>
        item.id === itemId
          ? { ...item, analysisStatus: data.analysisStatus, analysisResult: data.analysisResult, errorMessage: data.errorMessage || null }
          : item
      )
      return {
        ...current,
        items: updatedItems,
        readyCount: updatedItems.filter((item) => item.analysisStatus === "ready_review").length,
        failedCount: updatedItems.filter((item) => item.analysisStatus === "failed").length,
      }
    })
    setActiveItemId(itemId)
    toast.success("Archivo reanalizado.")
  }

  return (
    <div className="min-h-[calc(100vh-140px)] space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_52%,#ffffff_100%)] p-6 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--kt-primary)]">Revision por lote</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Carga varios PDF y revisa cada guía una por una</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              El sistema analiza cada PDF, arma una cola de revisión y te deja confirmar cada guía sin perder el avance del lote.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900">
              Seleccionar PDFs
              <input type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={handleSelectFiles} />
            </label>
            <button
              type="button"
              onClick={handleCreateBatch}
              disabled={uploading || files.length === 0}
              className="rounded-2xl bg-[var(--kt-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_35px_-20px_rgba(37,99,235,0.85)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Analizando lote..." : `Crear lote (${files.length})`}
            </button>
          </div>
        </div>

        {files.length > 0 && !batch && (
          <div className="mt-5 flex flex-wrap gap-2">
            {files.map((file) => (
              <span key={`${file.name}-${file.size}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {file.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {batch && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Lote {batch.id.slice(0, 8)}</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">Cola de revisión</h2>
                </div>
                <button type="button" onClick={handleRefreshBatch} className="text-xs font-medium text-[var(--kt-primary)]">
                  Actualizar
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-slate-100 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Listos</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{batch.readyCount}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-emerald-600">Guardados</p>
                  <p className="mt-1 text-xl font-semibold text-emerald-700">{batch.savedCount}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-rose-600">Fallidos</p>
                  <p className="mt-1 text-xl font-semibold text-rose-700">{batch.failedCount}</p>
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100vh-360px)] overflow-y-auto p-3">
              {batch.items.map((item) => {
                const isActive = item.id === activeItemId
                const statusColor =
                  item.analysisStatus === "saved"
                    ? "bg-emerald-100 text-emerald-700"
                    : item.analysisStatus === "failed"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveItemId(item.id)}
                    className={`mb-2 w-full rounded-2xl border p-4 text-left transition ${isActive ? "border-[var(--kt-primary)] bg-[var(--kt-primary-light)]/40 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">#{item.sortOrder + 1}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.fileName}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusColor}`}>
                        {item.analysisStatus === "ready_review" ? "Listo" : item.analysisStatus}
                      </span>
                    </div>
                    {item.errorMessage && <p className="mt-2 line-clamp-2 text-xs text-rose-600">{item.errorMessage}</p>}
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="min-w-0">
            {activeItem?.analysisStatus === "ready_review" && activeItem.analysisResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Item activo</p>
                    <p className="mt-1 text-sm text-slate-700">{activeItem.fileName}</p>
                  </div>
                  <button type="button" onClick={moveToNextPending} disabled={!nextPendingItem} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
                    Siguiente pendiente
                  </button>
                </div>

                <GuiaValijaReviewPanel
                  result={activeItem.analysisResult}
                  fileName={activeItem.fileName}
                  fileUrl={buildInlineFileUrl(activeItem.filePath)}
                  documentId={activeItem.analysisResult.documentId || undefined}
                  saveLabel="Guardar y continuar"
                  onSaveGuia={handleSaveCurrentItem}
                  onSaveSuccess={() => {
                    toast.success(`Guía guardada desde el lote: ${activeItem.fileName}`)
                    setTimeout(moveToNextPending, 0)
                  }}
                  onSaveError={(message) => toast.error(message)}
                />
              </div>
            ) : activeItem ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Estado del item</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">{activeItem.fileName}</h2>
                <p className="mt-3 text-sm text-slate-600">
                  {activeItem.analysisStatus === "saved"
                    ? "Este archivo ya fue guardado como guía de valija."
                    : activeItem.errorMessage || "Este item no está listo para revisión todavía."}
                </p>
                {activeItem.analysisStatus !== "saved" && (
                  <button
                    type="button"
                    onClick={() => handleReanalyze(activeItem.id)}
                    className="mt-5 rounded-2xl bg-[var(--kt-primary)] px-4 py-3 text-sm font-semibold text-white"
                  >
                    Reanalizar archivo
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-10 text-center text-slate-600">
                Crea un lote para comenzar la revisión secuencial.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
