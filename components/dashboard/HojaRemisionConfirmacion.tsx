import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  FileText,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  RefreshCw,
  TableProperties,
} from "lucide-react"
import PDFViewer from "./PDFViewer"
import type { ParsedHojaRemisionData } from "@/lib/hojas-remision-parser"
import { HOJA_REMISION_STATUS, normalizeHojaRemisionEstado } from "@/lib/hoja-remision-status"

interface HojaRemisionConfirmacionProps {
  extractedData: ParsedHojaRemisionData
  azureResult: any
  fileName: string
  fileSize: number
  file?: File
  onConfirm: () => void
  onReject: () => void
  onRetry: () => void
  onDataChanged?: (data: ParsedHojaRemisionData) => void
}

function getConfidenceBar(confidence: number) {
  const percentage = Math.round(confidence * 100)

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full ${
            confidence >= 0.9
              ? "bg-green-500"
              : confidence >= 0.7
              ? "bg-yellow-500"
              : confidence > 0
              ? "bg-orange-500"
              : "bg-red-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-600">{percentage}%</span>
    </div>
  )
}

function buildTableMatrix(table: any) {
  const rows = table?.rowCount || 0
  const cols = table?.columnCount || 0
  const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""))

  for (const cell of table?.cells || []) {
    if (
      typeof cell?.rowIndex === "number" &&
      typeof cell?.columnIndex === "number" &&
      cell.rowIndex < rows &&
      cell.columnIndex < cols
    ) {
      matrix[cell.rowIndex][cell.columnIndex] = cell.content || ""
    }
  }

  return matrix
}

export function HojaRemisionConfirmacion({
  extractedData,
  azureResult,
  fileName,
  fileSize,
  file,
  onConfirm,
  onReject,
  onRetry,
  onDataChanged,
}: HojaRemisionConfirmacionProps) {
  const [showAzureJson, setShowAzureJson] = useState(false)
  const [showTables, setShowTables] = useState(true)
  const [editableData, setEditableData] = useState<ParsedHojaRemisionData>(extractedData)

  useEffect(() => {
    setEditableData({
      ...extractedData,
      estado: normalizeHojaRemisionEstado(extractedData.estado),
    })
  }, [extractedData])

  const azureTables = useMemo(() => {
    return (azureResult?.tables || []).map((table: any, index: number) => ({
      index,
      rowCount: table.rowCount || 0,
      columnCount: table.columnCount || 0,
      matrix: buildTableMatrix(table),
    }))
  }, [azureResult])

  const handleFieldChange = (field: keyof ParsedHojaRemisionData, value: any) => {
    const newData = {
      ...editableData,
      [field]: value,
    }
    setEditableData(newData)
    onDataChanged?.(newData)
  }

  const hasRequiredFields = Boolean(
    editableData.numeroCompleto && editableData.fecha && editableData.remitente
  )

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-[var(--kt-gray-200)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--kt-text-dark)]">
              Confirmar datos extraidos
            </h1>
            <p className="mt-2 text-sm text-[var(--kt-text-muted)]">
              Revisa la extracción antes de enviarla al formulario maestro.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-100 text-blue-800">PDF analizado automaticamente</Badge>
            <Badge variant="outline">{fileName}</Badge>
            <Badge variant="outline">{Math.round(fileSize / 1024)} KB</Badge>
          </div>
        </div>
      </div>

      {!hasRequiredFields && (
        <Card className="border-l-4 border-l-[var(--kt-warning)]">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">!</span>
              <div>
                <p className="font-medium text-[var(--kt-warning)]">
                  Algunos campos requeridos no se detectaron correctamente
                </p>
                <p className="mt-1 text-sm text-[var(--kt-text-muted)]">
                  Puedes confirmar de todas formas y corregir luego, o rechazar estos datos y subir otro PDF.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(420px,0.85fr)_minmax(680px,1.15fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24">
          <Card className="overflow-hidden border-[var(--kt-gray-200)] bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">PDF original</CardTitle>
              <CardDescription>{fileName}</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-[calc(100vh-360px)] min-h-[520px]">
                {file ? <PDFViewer file={file} /> : <p className="text-center text-[var(--kt-text-muted)]">No hay archivo PDF</p>}
              </div>
            </CardContent>
          </Card>

          {azureTables.length > 0 && (
            <Card className="overflow-hidden border-[var(--kt-gray-200)]">
              <button
                onClick={() => setShowTables((prev) => !prev)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--kt-gray-50)]"
              >
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TableProperties className="h-5 w-5" />
                    Tablas extraidas
                  </CardTitle>
                  <CardDescription>
                    Se detectaron {azureTables.length} tablas en el documento.
                  </CardDescription>
                </div>
                {showTables ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </button>

              {showTables && (
                <CardContent className="space-y-4 border-t border-[var(--kt-gray-200)]">
                  {azureTables.map((table: { index: number; rowCount: number; columnCount: number; matrix: string[][] }) => (
                    <div key={table.index} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[var(--kt-text-dark)]">Tabla {table.index + 1}</p>
                        <span className="text-xs text-[var(--kt-text-muted)]">
                          {table.rowCount} filas x {table.columnCount} columnas
                        </span>
                      </div>
                      <div className="overflow-auto rounded-lg border border-[var(--kt-gray-200)]">
                        <Table className="min-w-full">
                          <TableHeader className="bg-[var(--kt-gray-50)]">
                            <TableRow>
                              {Array.from({ length: table.columnCount }).map((_, colIndex) => (
                                <TableHead key={colIndex} className="px-3 py-2 text-xs">
                                  Col {colIndex + 1}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {table.matrix.map((row: string[], rowIndex: number) => (
                              <TableRow key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={`${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top text-xs">
                                    {cell || "-"}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          )}
        </aside>

        <div className="space-y-6">
          <Card className="overflow-hidden border-[var(--kt-gray-200)]">
            <CardHeader className="border-b border-[var(--kt-gray-200)] bg-[linear-gradient(180deg,#f8fafc,white)]">
              <CardTitle>Campos extraidos</CardTitle>
              <CardDescription>Datos detectados automaticamente con su nivel de confianza.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-[var(--kt-text-muted)]">Número Completo</span>
                    <Badge variant="destructive" className="text-xs">Requerido</Badge>
                  </div>
                  <input
                    type="text"
                    value={editableData.numeroCompleto || ""}
                    onChange={(e) => handleFieldChange("numeroCompleto", e.target.value)}
                    className="w-full rounded-md border border-[var(--kt-gray-300)] bg-white px-3 py-2 text-lg font-medium focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)]"
                    placeholder="No detectado"
                  />
                  {getConfidenceBar(extractedData.confidence.numeroCompleto)}
                </div>

                <div className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-[var(--kt-text-muted)]">Unidad</span>
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  </div>
                  <input
                    type="text"
                    value={editableData.siglaUnidad || ""}
                    onChange={(e) => handleFieldChange("siglaUnidad", e.target.value)}
                    className="w-full rounded-md border border-[var(--kt-gray-300)] bg-white px-3 py-2 text-lg font-medium focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)]"
                    placeholder="No detectada"
                  />
                  {getConfidenceBar(extractedData.confidence.siglaUnidad)}
                </div>

                <div className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-[var(--kt-text-muted)]">Fecha</span>
                    <Badge variant="destructive" className="text-xs">Requerido</Badge>
                  </div>
                  <input
                    type="date"
                    value={editableData.fecha ? new Date(editableData.fecha).toISOString().split("T")[0] : ""}
                    onChange={(e) => handleFieldChange("fecha", e.target.value ? new Date(e.target.value) : null)}
                    className="w-full rounded-md border border-[var(--kt-gray-300)] bg-white px-3 py-2 text-lg font-medium focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)]"
                  />
                  {getConfidenceBar(extractedData.confidence.fecha)}
                </div>

                <div className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4 xl:col-span-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-[var(--kt-text-muted)]">Remitente</span>
                    <Badge variant="destructive" className="text-xs">Requerido</Badge>
                  </div>
                  <textarea
                    value={editableData.remitente || ""}
                    onChange={(e) => handleFieldChange("remitente", e.target.value)}
                    className="min-h-[88px] w-full resize-y rounded-md border border-[var(--kt-gray-300)] bg-white px-3 py-2 text-base font-medium focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)]"
                    placeholder="No detectado"
                    rows={3}
                  />
                  {getConfidenceBar(extractedData.confidence.remitente)}
                </div>

                <div className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4 xl:col-span-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-[var(--kt-text-muted)]">Referencia</span>
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  </div>
                  <input
                    type="text"
                    value={editableData.referencia || ""}
                    onChange={(e) => handleFieldChange("referencia", e.target.value)}
                    className="w-full rounded-md border border-[var(--kt-gray-300)] bg-white px-3 py-2 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)]"
                    placeholder="No detectada"
                  />
                  {getConfidenceBar(extractedData.confidence.referencia ?? 0)}
                </div>

                <div className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4 xl:col-span-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-[var(--kt-text-muted)]">Descripción empaque</span>
                    <Badge variant="outline" className="text-xs">Logistica</Badge>
                  </div>
                  <input
                    type="text"
                    value={editableData.descripcionEmpaque || ""}
                    onChange={(e) => handleFieldChange("descripcionEmpaque", e.target.value)}
                    className="w-full rounded-md border border-[var(--kt-gray-300)] bg-white px-3 py-2 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)]"
                    placeholder="Caja, paquete, caja de carton, etc."
                  />
                  {getConfidenceBar(extractedData.confidence.descripcionEmpaque ?? 0)}
                </div>

                <div className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4 xl:col-span-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-[var(--kt-text-muted)]">Estado</span>
                    <Badge variant="outline" className="text-xs">Operativo</Badge>
                  </div>
                  <Select
                    value={normalizeHojaRemisionEstado(editableData.estado)}
                    onValueChange={(value) => handleFieldChange("estado", value)}
                  >
                    <SelectTrigger className="w-full rounded-md border border-[var(--kt-gray-300)] bg-white px-3 py-2 text-base focus:ring-2 focus:ring-[var(--kt-primary)]">
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={HOJA_REMISION_STATUS.PENDING_REVIEW}>SIN REVISAR</SelectItem>
                      <SelectItem value={HOJA_REMISION_STATUS.REVIEWED}>REVISADA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4 xl:col-span-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-[var(--kt-text-muted)]">Documento</span>
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  </div>
                  <textarea
                    value={editableData.documento || ""}
                    onChange={(e) => handleFieldChange("documento", e.target.value)}
                    className="min-h-[88px] w-full resize-y rounded-md border border-[var(--kt-gray-300)] bg-white px-3 py-2 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)]"
                    placeholder="No detectado"
                    rows={3}
                  />
                  {getConfidenceBar(extractedData.confidence.documento)}
                </div>

                <div className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4 xl:col-span-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-[var(--kt-text-muted)]">Asunto</span>
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  </div>
                  <textarea
                    value={editableData.asunto || ""}
                    onChange={(e) => handleFieldChange("asunto", e.target.value)}
                    className="min-h-[88px] w-full resize-y rounded-md border border-[var(--kt-gray-300)] bg-white px-3 py-2 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)]"
                    placeholder="No detectado"
                    rows={3}
                  />
                  {getConfidenceBar(extractedData.confidence.asunto)}
                </div>

                <div className="rounded-lg border border-[var(--kt-gray-200)] bg-[var(--kt-gray-50)] p-4 xl:col-span-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase text-[var(--kt-text-muted)]">Destino</span>
                    <Badge variant="outline" className="text-xs">Opcional</Badge>
                  </div>
                  <input
                    type="text"
                    value={editableData.destino || ""}
                    onChange={(e) => handleFieldChange("destino", e.target.value)}
                    className="w-full rounded-md border border-[var(--kt-gray-300)] bg-white px-3 py-2 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--kt-primary)]"
                    placeholder="No detectado"
                  />
                  {getConfidenceBar(extractedData.confidence.destino)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <button
              onClick={() => setShowAzureJson((prev) => !prev)}
              className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[var(--kt-gray-50)]"
            >
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="text-2xl">{`{ }`}</span>
                  Respuesta técnica del análisis
                </CardTitle>
                <CardDescription>
                  Respuesta cruda del motor de análisis documental
                  {azureResult && (
                    <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                      {azureResult.keyValuePairs?.length || 0} keyValuePairs
                    </span>
                  )}
                </CardDescription>
              </div>
              {showAzureJson ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>

            {showAzureJson && azureResult && (
              <CardContent className="border-t border-[var(--kt-gray-200)]">
                <div className="overflow-hidden rounded-lg bg-[var(--kt-gray-900)]">
                  <pre className="max-h-[500px] overflow-x-auto overflow-y-auto p-4 text-xs text-[var(--kt-gray-100)]">
                    {JSON.stringify(azureResult, null, 2)}
                  </pre>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {azureResult.keyValuePairs && (
                    <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
                      keyValuePairs: {azureResult.keyValuePairs.length} campos
                    </span>
                  )}
                  {azureResult.tables && (
                    <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
                      tables: {azureResult.tables.length} tablas
                    </span>
                  )}
                  {azureResult.pages && (
                    <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
                      pages: {azureResult.pages.length} paginas
                    </span>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button onClick={onConfirm} className="w-full bg-green-600 hover:bg-green-700 sm:w-auto" size="lg">
              <Check className="mr-2 h-5 w-5" />
              Guardar
            </Button>

            <Button onClick={onReject} variant="outline" className="w-full sm:w-auto" size="lg">
              <X className="mr-2 h-5 w-5" />
              Rechazar datos
            </Button>

            <Button onClick={onRetry} variant="ghost" className="w-full sm:w-auto" size="lg">
              <RefreshCw className="mr-2 h-5 w-5" />
              Subir otro PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
