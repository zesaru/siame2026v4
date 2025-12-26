"use client"

import { useState } from "react"
import { DocumentAnalysisResult } from "@/lib/document-intelligence"

interface DocumentResultsProps {
  result: DocumentAnalysisResult
  fileName: string
  fileUrl: string
}

export default function DocumentResults(props: DocumentResultsProps) {
  const { result, fileName, fileUrl } = props
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
          azureResult: result,
          fileName: fileName,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSaveMessage({
          type: 'success',
          text: `Guía de valija guardada exitosamente. Nº: ${data.guia.numeroGuia}`
        })
        console.log("Guía de valija guardada:", data.guia)
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
                Found: {result.tables?.length || 0} tables, {result.keyValuePairs?.length || 0} key-value pairs
              </p>
            </div>

            {/* Key-Value Pairs */}
            {result.keyValuePairs && result.keyValuePairs.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ fontSize: "18px", fontWeight: "500", color: "#111827", marginBottom: "12px" }}>Key-Value Pairs</h4>
                <div style={{ backgroundColor: "#f9fafb", padding: "16px", borderRadius: "8px", maxHeight: "300px", overflow: "auto" }}>
                  {result.keyValuePairs.map((pair, idx) => (
                    <div key={idx} style={{ marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #e5e7eb" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#1f2937" }}>{pair.key}:</span>
                      <span style={{ fontSize: "13px", color: "#4b5563", marginLeft: "8px" }}>{pair.value || "(vacío)"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tables */}
            {result.tables && result.tables.length > 0 && (
              <div style={{ marginBottom: "24px" }}>
                <h4 style={{ fontSize: "18px", fontWeight: "500", color: "#111827", marginBottom: "12px" }}>
                  Tables ({result.tables.length})
                </h4>
                {result.tables.map((table, tableIdx) => (
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
                              return (
                                <th key={colIdx} style={{ border: "1px solid #d1d5db", padding: "8px", fontWeight: "600", textAlign: "left" }}>
                                  {headerCell?.content || `Col ${colIdx + 1}`}
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
                                return (
                                  <td key={colIdx} style={{ border: "1px solid #e5e7eb", padding: "6px", textAlign: "left" }}>
                                    {cell?.content || ""}
                                    {cell?.confidence && (
                                      <span style={{ fontSize: "10px", color: "#9ca3af", marginLeft: "4px" }}>
                                        ({(cell.confidence * 100).toFixed(0)}%)
                                      </span>
                                    )}
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

            {/* Extracted Text */}
            <div>
              <h4 style={{ fontSize: "18px", fontWeight: "500", color: "#111827", marginBottom: "12px" }}>Extracted Text</h4>
              <div style={{ backgroundColor: "#f9fafb", padding: "16px", borderRadius: "8px", maxHeight: "256px", overflow: "auto" }}>
                <pre style={{ fontSize: "14px", color: "#374151", whiteSpace: "pre-wrap" }}>
                  {result.content || 'No text content extracted'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}