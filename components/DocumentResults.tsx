"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DocumentAnalysisResult } from "@/lib/document-intelligence"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import Icon from "@/components/ui/Icon"
import { toast } from "sonner"
import GuiaValijaForm from "./GuiaValijaForm"

interface KeyValuePair {
  key: string
  value: string
  confidence?: number
  boundingRegions?: any[]
}

interface DocumentResultsProps {
  result: DocumentAnalysisResult
  fileName: string
  fileUrl: string
  documentId?: string
}

export default function DocumentResults(props: DocumentResultsProps) {
  const router = useRouter()
  const { result, fileName, fileUrl, documentId } = props
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editedPairs, setEditedPairs] = useState<KeyValuePair[]>(result.keyValuePairs)
  const [isExtractedTextExpanded, setIsExtractedTextExpanded] = useState(false)
  const [editedTables, setEditedTables] = useState(result.tables || [])
  const [isTablesExpanded, setIsTablesExpanded] = useState(true)
  const [isKeyValuePairsExpanded, setIsKeyValuePairsExpanded] = useState(false)

  const handleFieldChange = (index: number, field: 'key' | 'value', newValue: string) => {
    const updated = [...editedPairs]
    updated[index] = {
      ...updated[index],
      [field]: newValue
    }
    setEditedPairs(updated)
  }

  const handleTableCellChange = (tableIdx: number, cellIdentifier: string, newValue: string) => {
    const updatedTables = [...editedTables]
    const table = updatedTables[tableIdx]
    const cellIndex = table.cells.findIndex((c: any) =>
      c.rowIndex === parseInt(cellIdentifier.split('-')[0]) &&
      c.columnIndex === parseInt(cellIdentifier.split('-')[1])
    )
    if (cellIndex !== -1) {
      table.cells[cellIndex] = { ...table.cells[cellIndex], content: newValue }
      setEditedTables(updatedTables)
    }
  }

  const handleSaveAsGuiaValija = async () => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const response = await fetch("/api/guias-valija/procesar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          azureResult: {
            ...result,
            keyValuePairs: editedPairs,
            tables: editedTables
          },
          fileName: fileName,
          documentId: documentId, // Pass documentId to retrieve the file
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Mostrar notificación de éxito
        toast.success(`Guía de valija guardada exitosamente. Nº: ${data.guia.numeroGuia}`)

        // Redirigir a la lista de Guías de Valija
        router.push('/dashboard/guias-valija')
      } else {
        setSaveMessage({
          type: 'error',
          text: data.error || "Error al guardar la guía de valija"
        })
      }
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : "Error al guardar"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "secondary"
    if (confidence >= 0.9) return "default"
    if (confidence >= 0.7) return "outline"
    return "destructive"
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 140px)" }}>
      <div style={{ width: "50%", borderRight: "1px solid #e5e7eb", backgroundColor: "#111827", overflow: "hidden" }}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ backgroundColor: "#1f2937", padding: "16px", borderBottom: "1px solid #374151" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "500", color: "#fff" }}>Original Document</h3>
            <p style={{ fontSize: "12px", color: "#9ca3af" }}>{fileName}</p>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            <iframe
              src={fileUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="PDF Preview"
            />
          </div>
        </div>
      </div>

      <div style={{ width: "50%", overflow: "auto", backgroundColor: "#f9fafb" }}>
        <div style={{ padding: "24px" }}>
          <div style={{ backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)", border: "1px solid #e5e7eb", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "600", color: "#111827" }}>
                Analysis Results: {fileName}
              </h3>
              <button
                onClick={handleSaveAsGuiaValija}
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
                  transition: "background-color 0.2s"
                }}
              >
                {isSaving ? "Guardando..." : "💾 Guardar como Guía de Valija"}
              </button>
            </div>

            {saveMessage && (
              <div style={{
                marginBottom: "16px",
                padding: "12px",
                backgroundColor: saveMessage.type === 'success' ? "#d1fae5" : "#fee2e2",
                border: `1px solid ${saveMessage.type === 'success' ? "#6ee7b7" : "#fca5a5"}`,
                borderRadius: "6px"
              }}>
                <p style={{
                  fontSize: "14px",
                  color: saveMessage.type === 'success' ? "#065f46" : "#991b1b"
                }}>
                  {saveMessage.text}
                </p>
              </div>
            )}

            <div style={{ marginBottom: "24px", padding: "16px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px" }}>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#1e40af" }}>
                Document analyzed successfully!
              </p>
              <p style={{ fontSize: "12px", color: "#1e3a8a", marginTop: "4px" }}>
                Found: {result.tables?.length || 0} tables, {editedPairs.length || 0} key-value pairs
              </p>
            </div>

            {/* Campos Principales de la Guía de Valija */}
            <GuiaValijaForm
              editedPairs={editedPairs}
              onFieldChange={handleFieldChange}
            />

            {/* Key-Value Pairs Editables - OCULTO: Usar Tables en su lugar */}
            {/* editedPairs.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ fontSize: "18px", fontWeight: "500", color: "#111827", margin: 0 }}>
                    Key-Value Pairs
                  </h4>
                  {documentId && (
                    <button
                      onClick={handleSaveEdits}
                      disabled={isSavingEdits}
                      style={{
                        padding: "6px 16px",
                        backgroundColor: isSavingEdits ? "#9ca3af" : "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "500",
                        cursor: isSavingEdits ? "not-allowed" : "pointer",
                        transition: "background-color 0.2s"
                      }}
                    >
                      {isSavingEdits ? "Guardando..." : "💾 Guardar Cambios"}
                    </button>
                  )}
                </div>
                <div style={{ backgroundColor: "#f9fafb", padding: "16px", borderRadius: "8px", maxHeight: "400px", overflow: "auto" }}>
                  {editedPairs.map((pair, idx) => (
                    <div key={idx} style={{
                      marginBottom: "12px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid #e5e7eb",
                      display: "grid",
                      gridTemplateColumns: "2fr 3fr 80px",
                      gap: "12px",
                      alignItems: "center"
                    }}>
                      <div>
                        <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: "500", marginBottom: "4px", display: "block" }}>
                          Key
                        </label>
                        <Input
                          value={pair.key}
                          onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
                          placeholder="Key"
                          className="text-sm"
                          style={{ fontSize: "13px" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: "500", marginBottom: "4px", display: "block" }}>
                          Value
                        </label>
                        <Input
                          value={pair.value}
                          onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                          placeholder="Value"
                          className="text-sm"
                          style={{ fontSize: "13px" }}
                        />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        {pair.confidence && (
                          <Badge variant={getConfidenceColor(pair.confidence)}>
                            {Math.round(pair.confidence * 100)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) */}

            {/* Tables */}
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
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                  }}
                  onClick={() => setIsTablesExpanded(!isTablesExpanded)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb"
                    e.currentTarget.style.borderColor = "#d1d5db"
                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff"
                    e.currentTarget.style.borderColor = "#e5e7eb"
                    e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icon
                      name="chart"
                      size="sm"
                      style={{ color: "#3b82f6" }}
                    />
                    <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>
                      Tablas de Datos ({result.tables.length})
                    </h4>
                  </div>
                  <div style={{
                    padding: "4px",
                    borderRadius: "6px",
                    backgroundColor: isTablesExpanded ? "#eff6ff" : "transparent",
                    transition: "all 0.2s ease"
                  }}>
                    <Icon
                      name={isTablesExpanded ? "chevron-up" : "chevron-down"}
                      size="sm"
                      style={{
                        color: isTablesExpanded ? "#3b82f6" : "#6b7280",
                        transition: "transform 0.2s ease"
                      }}
                    />
                  </div>
                </div>
                {isTablesExpanded && editedTables.map((table: any, tableIdx: number) => (
                  <div key={tableIdx} style={{ marginBottom: "16px" }}>
                    <p style={{ fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>
                      Tabla {tableIdx + 1}: {table.rowCount} filas × {table.columnCount} columnas
                    </p>
                    <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                        <thead style={{ backgroundColor: "#f3f4f6" }}>
                          <tr>
                            {Array.from({ length: table.columnCount }).map((_, colIdx) => {
                              const headerCell = table.cells.find((c: any) => c.kind === "columnHeader" && c.columnIndex === colIdx)
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
                                    width: isNumeroColumn ? "60px" : isCantidadColumn ? "80px" : isPesoItemColumn ? "120px" : "auto"
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
                                const cell = table.cells.find((c: any) => c.rowIndex === rowIdx + 1 && c.columnIndex === colIdx)
                                const cellId = `${rowIdx + 1}-${colIdx}`
                                // Obtener el header para verificar si es la columna Nº, CAN T. o PESO
                                const headerCell = table.cells.find((c: any) => c.kind === "columnHeader" && c.columnIndex === colIdx)
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
                                      width: isNumeroColumn ? "60px" : isCantidadColumn ? "80px" : isPesoItemColumn ? "120px" : "auto"
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
                ))}
              </div>
            )}

            {/* Key-Value Pairs Completos - Colapsable */}
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
                    boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                  }}
                  onClick={() => setIsKeyValuePairsExpanded(!isKeyValuePairsExpanded)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb"
                    e.currentTarget.style.borderColor = "#d1d5db"
                    e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff"
                    e.currentTarget.style.borderColor = "#e5e7eb"
                    e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icon
                      name="check"
                      size="sm"
                      style={{ color: "#10b981" }}
                    />
                    <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>
                      Key-Value Pairs Completos ({editedPairs.length})
                    </h4>
                    <span style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      fontWeight: "400",
                      backgroundColor: "#f3f4f6",
                      padding: "2px 8px",
                      borderRadius: "12px"
                    }}>
                      Todos los campos extraídos
                    </span>
                  </div>
                  <div style={{
                    padding: "4px",
                    borderRadius: "6px",
                    backgroundColor: isKeyValuePairsExpanded ? "#eff6ff" : "transparent",
                    transition: "all 0.2s ease"
                  }}>
                    <Icon
                      name={isKeyValuePairsExpanded ? "chevron-up" : "chevron-down"}
                      size="sm"
                      style={{
                        color: isKeyValuePairsExpanded ? "#3b82f6" : "#6b7280",
                        transition: "transform 0.2s ease"
                      }}
                    />
                  </div>
                </div>

                {isKeyValuePairsExpanded && (
                  <div style={{ backgroundColor: "#f9fafb", padding: "16px", borderRadius: "8px", maxHeight: "500px", overflow: "auto" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr 80px", gap: "12px", fontWeight: "600", fontSize: "13px", color: "#6b7280", paddingBottom: "8px", borderBottom: "1px solid #e5e7eb", marginBottom: "12px" }}>
                      <div>Key</div>
                      <div>Value</div>
                      <div style={{ textAlign: "center" }}>Confianza</div>
                    </div>
                    {editedPairs.map((pair, idx) => (
                      <div key={idx} style={{
                        paddingBottom: "12px",
                        marginBottom: "12px",
                        borderBottom: "1px solid #e5e7eb",
                        display: "grid",
                        gridTemplateColumns: "2fr 3fr 80px",
                        gap: "12px",
                        alignItems: "center"
                      }}>
                        <div>
                          <Input
                            value={pair.key}
                            onChange={(e) => handleFieldChange(idx, 'key', e.target.value)}
                            placeholder="Key"
                            className="text-xs"
                            style={{ fontSize: "12px" }}
                          />
                        </div>
                        <div>
                          <Input
                            value={pair.value}
                            onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                            placeholder="Value"
                            className="text-xs"
                            style={{ fontSize: "12px" }}
                          />
                        </div>
                        <div style={{ textAlign: "center" }}>
                          {pair.confidence && (
                            <Badge variant={getConfidenceColor(pair.confidence)}>
                              {Math.round(pair.confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Extracted Text */}
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
                  boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                }}
                onClick={() => setIsExtractedTextExpanded(!isExtractedTextExpanded)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f9fafb"
                  e.currentTarget.style.borderColor = "#d1d5db"
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#fff"
                  e.currentTarget.style.borderColor = "#e5e7eb"
                  e.currentTarget.style.boxShadow = "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Icon
                    name={isExtractedTextExpanded ? "file-text" : "file-text"}
                    size="sm"
                    style={{ color: "#3b82f6" }}
                  />
                  <h4 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>
                    Extracted Text
                  </h4>
                  {result.content && (
                    <span style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      fontWeight: "400",
                      backgroundColor: "#f3f4f6",
                      padding: "2px 8px",
                      borderRadius: "12px"
                    }}>
                      {result.content.length} caracteres
                    </span>
                  )}
                </div>
                <div style={{
                  padding: "4px",
                  borderRadius: "6px",
                  backgroundColor: isExtractedTextExpanded ? "#eff6ff" : "transparent",
                  transition: "all 0.2s ease"
                }}>
                  <Icon
                    name={isExtractedTextExpanded ? "chevron-up" : "chevron-down"}
                    size="sm"
                    style={{
                      color: isExtractedTextExpanded ? "#3b82f6" : "#6b7280",
                      transition: "transform 0.2s ease"
                    }}
                  />
                </div>
              </div>
              {isExtractedTextExpanded && (
                <div style={{
                  backgroundColor: "#f9fafb",
                  padding: "16px",
                  borderRadius: "8px",
                  maxHeight: "256px",
                  overflow: "auto",
                  border: "1px solid #e5e7eb",
                  borderTop: "none",
                  marginTop: "-4px"
                }}>
                  <pre style={{ fontSize: "14px", color: "#374151", whiteSpace: "pre-wrap" }}>
                    {result.content || 'No text content extracted'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
