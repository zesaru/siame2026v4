"use client"

import { useCallback, useMemo, useState } from "react"
import type { DocumentAnalysisResult } from "@/lib/document-intelligence"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Icon from "@/components/ui/Icon"
import GuiaValijaForm from "@/components/GuiaValijaForm"

export interface GuiaValijaReviewSavePayload {
  azureResult: DocumentAnalysisResult
  fileName: string
  documentId?: string
}

export interface GuiaValijaReviewSaveResult {
  guia?: {
    numeroGuia?: string | null
  } | null
  error?: string
}

interface KeyValuePair {
  key: string
  value: string
  confidence?: number
  boundingRegions?: unknown[]
}

interface TableCell {
  kind?: string
  content: string
  rowIndex: number
  columnIndex: number
  confidence?: number
}

interface TableData {
  rowCount: number
  columnCount: number
  cells: TableCell[]
}

interface IndexedTableView {
  headerByColumn: Map<number, TableCell>
  cellByCoordinate: Map<string, TableCell>
}

interface GuiaValijaReviewPanelProps {
  result: DocumentAnalysisResult
  fileName: string
  fileUrl: string
  documentId?: string
  saveLabel?: string
  onSaveGuia: (payload: GuiaValijaReviewSavePayload) => Promise<GuiaValijaReviewSaveResult>
  onSaveSuccess?: (response: GuiaValijaReviewSaveResult) => void
  onSaveError?: (message: string) => void
}

export function GuiaValijaReviewPanel({
  result,
  fileName,
  fileUrl,
  documentId,
  saveLabel = "Guardar como Guía de Valija",
  onSaveGuia,
  onSaveSuccess,
  onSaveError,
}: GuiaValijaReviewPanelProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [editedPairs, setEditedPairs] = useState<KeyValuePair[]>((result.keyValuePairs as KeyValuePair[]) || [])
  const [isExtractedTextExpanded, setIsExtractedTextExpanded] = useState(false)
  const [editedTables, setEditedTables] = useState<TableData[]>((result.tables as TableData[]) || [])
  const [isTablesExpanded, setIsTablesExpanded] = useState(true)
  const [isKeyValuePairsExpanded, setIsKeyValuePairsExpanded] = useState(false)

  const tableViews = useMemo<IndexedTableView[]>(
    () =>
      editedTables.map((table) => {
        const headerByColumn = new Map<number, TableCell>()
        const cellByCoordinate = new Map<string, TableCell>()

        for (const cell of table.cells) {
          cellByCoordinate.set(`${cell.rowIndex}-${cell.columnIndex}`, cell)
          if (cell.kind === "columnHeader") {
            headerByColumn.set(cell.columnIndex, cell)
          }
        }

        return { headerByColumn, cellByCoordinate }
      }),
    [editedTables]
  )

  const handleFieldChange = useCallback((index: number, field: "key" | "value", newValue: string) => {
    setEditedPairs((current) => {
      const updated = [...current]
      updated[index] = {
        ...updated[index],
        [field]: newValue,
      }
      return updated
    })
  }, [])

  const handleTableCellChange = useCallback((tableIdx: number, cellIdentifier: string, newValue: string) => {
    setEditedTables((current) => {
      const updatedTables = [...current]
      const table = updatedTables[tableIdx]
      const [rowToken, colToken] = cellIdentifier.split("-")
      const rowIndex = Number.parseInt(rowToken, 10)
      const columnIndex = Number.parseInt(colToken, 10)
      const cellIndex = table.cells.findIndex((c) => c.rowIndex === rowIndex && c.columnIndex === columnIndex)
      if (cellIndex !== -1) {
        table.cells[cellIndex] = { ...table.cells[cellIndex], content: newValue }
      }
      return updatedTables
    })
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await onSaveGuia({
        azureResult: {
          ...result,
          keyValuePairs: editedPairs,
          tables: editedTables,
        },
        fileName,
        documentId,
      })

      if (response.error) {
        setSaveMessage({ type: "error", text: response.error })
        onSaveError?.(response.error)
        return
      }

      const numeroGuia = response.guia?.numeroGuia || "sin número"
      const successText = `Guía de valija guardada exitosamente. Nº: ${numeroGuia}`
      setSaveMessage({ type: "success", text: successText })
      onSaveSuccess?.(response)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al guardar la guía de valija"
      setSaveMessage({ type: "error", text: message })
      onSaveError?.(message)
    } finally {
      setIsSaving(false)
    }
  }, [documentId, editedPairs, editedTables, fileName, onSaveError, onSaveGuia, onSaveSuccess, result])

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "secondary" as const
    if (confidence >= 0.9) return "default" as const
    if (confidence >= 0.7) return "outline" as const
    return "destructive" as const
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 140px)" }}>
      <div style={{ width: "50%", borderRight: "1px solid #e5e7eb", backgroundColor: "#111827", overflow: "hidden" }}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ backgroundColor: "#1f2937", padding: "16px", borderBottom: "1px solid #374151" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "500", color: "#fff" }}>Documento Original</h3>
            <p style={{ fontSize: "12px", color: "#9ca3af" }}>{fileName}</p>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            <iframe src={fileUrl} style={{ width: "100%", height: "100%", border: "none" }} title="Vista Previa PDF" />
          </div>
        </div>
      </div>

      <div style={{ width: "50%", overflow: "auto", backgroundColor: "#f9fafb" }}>
        <div style={{ padding: "24px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)", border: "1px solid #e5e7eb", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#111827" }}>Resultados del Análisis: {fileName}</h3>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: "10px 20px",
                  backgroundColor: isSaving ? "#9ca3af" : "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: isSaving ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s",
                }}
              >
                {isSaving ? "Guardando..." : `💾 ${saveLabel}`}
              </button>
            </div>

            {saveMessage && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  backgroundColor: saveMessage.type === "success" ? "#d1fae5" : "#fee2e2",
                  border: `1px solid ${saveMessage.type === "success" ? "#6ee7b7" : "#fca5a5"}`,
                  borderRadius: "6px",
                }}
              >
                <p
                  style={{
                    fontSize: "14px",
                    color: saveMessage.type === "success" ? "#065f46" : "#991b1b",
                  }}
                >
                  {saveMessage.text}
                </p>
              </div>
            )}

            <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#1e40af" }}>Documento analizado correctamente.</p>
              <p style={{ fontSize: "12px", color: "#1e3a8a", marginTop: "4px" }}>
                Se detectaron {result.tables?.length || 0} tablas y {editedPairs.length || 0} pares clave-valor
              </p>
            </div>

            <GuiaValijaForm editedPairs={editedPairs} onFieldChange={handleFieldChange} rawContent={result.content || ""} />

            {result.tables && result.tables.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    marginBottom: isTablesExpanded ? "16px" : 0,
                    padding: "12px 16px",
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  }}
                  onClick={() => setIsTablesExpanded(!isTablesExpanded)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icon name="chart" size="sm" style={{ color: "#3b82f6" }} />
                    <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>
                      Tablas de Datos ({result.tables.length})
                    </h4>
                  </div>
                  <div
                    style={{
                      padding: "4px",
                      borderRadius: "6px",
                      backgroundColor: isTablesExpanded ? "#eff6ff" : "transparent",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Icon name={isTablesExpanded ? "chevron-up" : "chevron-down"} size="sm" style={{ color: isTablesExpanded ? "#3b82f6" : "#6b7280" }} />
                  </div>
                </div>
                {isTablesExpanded &&
                  editedTables.map((table, tableIdx: number) => {
                    const tableView = tableViews[tableIdx]
                    const isPrecintosTable = tableIdx === 0
                    return (
                      <div key={tableIdx} style={{ marginBottom: "16px" }}>
                        <p style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
                          Tabla {tableIdx + 1}: {table.rowCount} filas × {table.columnCount} columnas
                        </p>
                        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
                          <table
                            style={{
                              width: isPrecintosTable ? "max-content" : "100%",
                              minWidth: "100%",
                              tableLayout: "auto",
                              borderCollapse: "collapse",
                              fontSize: "12px",
                            }}
                          >
                            <thead style={{ backgroundColor: "#f3f4f6" }}>
                              <tr>
                                {Array.from({ length: table.columnCount }).map((_, colIdx) => {
                                  const headerCell = tableView?.headerByColumn.get(colIdx)
                                  const cellId = `${0}-${colIdx}`
                                  const headerContent = headerCell?.content || `Col ${colIdx + 1}`
                                  const isNumeroColumn = headerContent.trim() === "Nº" || headerContent.includes("Nº")
                                  const isPesoItemColumn = headerContent.includes("PESO ITEM") || headerContent.includes("PESO P/ ITEM")
                                  const isCantidadColumn = headerContent.includes("CAN T.")

                                  return (
                                    <th
                                      key={colIdx}
                                      style={{
                                        border: "1px solid #d1d5db",
                                        padding: "4px",
                                        fontWeight: "600",
                                        textAlign: "left",
                                        width: isPrecintosTable ? "auto" : isNumeroColumn ? "60px" : isCantidadColumn ? "80px" : isPesoItemColumn ? "120px" : "auto",
                                      }}
                                    >
                                      <Input
                                        value={headerContent}
                                        onChange={(e) => handleTableCellChange(tableIdx, cellId, e.target.value)}
                                        className="text-xs bg-white"
                                        style={{ fontSize: "12px", fontWeight: 600, border: "none", background: "transparent" }}
                                      />
                                    </th>
                                  )
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: table.rowCount - 1 }).map((_, rowIdx) => (
                                <tr key={rowIdx}>
                                  {Array.from({ length: table.columnCount }).map((_, colIdx) => {
                                    const cell = tableView?.cellByCoordinate.get(`${rowIdx + 1}-${colIdx}`)
                                    const cellId = `${rowIdx + 1}-${colIdx}`
                                    const headerCell = tableView?.headerByColumn.get(colIdx)
                                    const headerContent = headerCell?.content || `Col ${colIdx + 1}`
                                    const isNumeroColumn = headerContent.trim() === "Nº" || headerContent.includes("Nº")
                                    const isPesoItemColumn = headerContent.includes("PESO ITEM") || headerContent.includes("PESO P/ ITEM")
                                    const isCantidadColumn = headerContent.includes("CAN T.")
                                    return (
                                      <td
                                        key={colIdx}
                                        style={{
                                          border: "1px solid #e5e7eb",
                                          padding: "4px",
                                          textAlign: "left",
                                          width: isPrecintosTable ? "auto" : isNumeroColumn ? "60px" : isCantidadColumn ? "80px" : isPesoItemColumn ? "120px" : "auto",
                                        }}
                                      >
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                          <Input
                                            value={cell?.content || ""}
                                            onChange={(e) => handleTableCellChange(tableIdx, cellId, e.target.value)}
                                            className="text-xs"
                                            style={{ fontSize: "12px", border: "none", padding: "4px" }}
                                          />
                                          {cell?.confidence && (
                                            <span style={{ fontSize: "10px", color: "#9ca3af", whiteSpace: "nowrap" }}>
                                              {(cell.confidence * 100).toFixed(0)}%
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    )
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}

            {editedPairs.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    marginBottom: isKeyValuePairsExpanded ? "16px" : 0,
                    padding: "12px 16px",
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                  }}
                  onClick={() => setIsKeyValuePairsExpanded(!isKeyValuePairsExpanded)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icon name="check" size="sm" style={{ color: "#10b981" }} />
                    <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>
                      Key-Value Pairs Completos ({editedPairs.length})
                    </h4>
                  </div>
                  <div
                    style={{
                      padding: "4px",
                      borderRadius: "6px",
                      backgroundColor: isKeyValuePairsExpanded ? "#eff6ff" : "transparent",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Icon name={isKeyValuePairsExpanded ? "chevron-up" : "chevron-down"} size="sm" style={{ color: isKeyValuePairsExpanded ? "#3b82f6" : "#6b7280" }} />
                  </div>
                </div>

                {isKeyValuePairsExpanded && (
                  <div style={{ backgroundColor: "#f9fafb", padding: "16px", borderRadius: "8px", maxHeight: "500px", overflow: "auto" }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "2fr 3fr 80px",
                        gap: "12px",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#6b7280",
                        paddingBottom: "8px",
                        borderBottom: "1px solid #e5e7eb",
                        marginBottom: "12px",
                      }}
                    >
                      <div>Key</div>
                      <div>Value</div>
                      <div style={{ textAlign: "center" }}>Confianza</div>
                    </div>
                    {editedPairs.map((pair, idx) => (
                      <div
                        key={idx}
                        style={{
                          paddingBottom: "12px",
                          marginBottom: "12px",
                          borderBottom: "1px solid #e5e7eb",
                          display: "grid",
                          gridTemplateColumns: "2fr 3fr 80px",
                          gap: "12px",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <Input value={pair.key} onChange={(e) => handleFieldChange(idx, "key", e.target.value)} placeholder="Key" className="text-xs" style={{ fontSize: "12px" }} />
                        </div>
                        <div>
                          <Input value={pair.value} onChange={(e) => handleFieldChange(idx, "value", e.target.value)} placeholder="Value" className="text-xs" style={{ fontSize: "12px" }} />
                        </div>
                        <div style={{ textAlign: "center" }}>
                          {pair.confidence && <Badge variant={getConfidenceColor(pair.confidence)}>{Math.round(pair.confidence * 100)}%</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  marginBottom: isExtractedTextExpanded ? "12px" : 0,
                  padding: "12px 16px",
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  transition: "all 0.2s ease",
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                }}
                onClick={() => setIsExtractedTextExpanded(!isExtractedTextExpanded)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon name="file-text" size="sm" style={{ color: "#3b82f6" }} />
                  <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>Extracted Text</h4>
                  {result.content && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        fontWeight: "400",
                        backgroundColor: "#f3f4f6",
                        padding: "2px 8px",
                        borderRadius: "12px",
                      }}
                    >
                      {result.content.length} caracteres
                    </span>
                  )}
                </div>
                <div
                  style={{
                    padding: "4px",
                    borderRadius: "6px",
                    backgroundColor: isExtractedTextExpanded ? "#eff6ff" : "transparent",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Icon name={isExtractedTextExpanded ? "chevron-up" : "chevron-down"} size="sm" style={{ color: isExtractedTextExpanded ? "#3b82f6" : "#6b7280" }} />
                </div>
              </div>
              {isExtractedTextExpanded && (
                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    padding: "16px",
                    borderRadius: "8px",
                    maxHeight: "256px",
                    overflow: "auto",
                    border: "1px solid #e5e7eb",
                    borderTop: "none",
                    marginTop: "-4px",
                  }}
                >
                  <pre style={{ fontSize: "14px", color: "#374151", whiteSpace: "pre-wrap" }}>{result.content || "No text content extracted"}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
