/**
 * Export data to CSV format and trigger download
 *
 * @example
 * ```ts
 * exportToCSV(data, ['nombre', 'edad', 'email'], 'usuarios.csv')
 * ```
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: string; label: string }[],
  filename: string
) {
  if (data.length === 0) {
    console.warn("No data to export")
    return
  }

  // Create header row
  const headers = columns.map((col) => col.label).join(",")

  // Create data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.key]

        // Handle null/undefined
        if (value == null) {
          return ""
        }

        // Handle dates
        if (value instanceof Date) {
          return value.toISOString()
        }

        // Handle objects/arrays (JSON stringify)
        if (typeof value === "object") {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        }

        // Handle strings with commas or quotes
        if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
          return `"${value.replace(/"/g, '""')}"`
        }

        return String(value)
      })
      .join(",")
  })

  // Combine header and rows
  const csv = [headers, ...rows].join("\n")

  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export data to JSON format and trigger download
 */
export function exportToJSON<T extends Record<string, any>>(
  data: T[],
  filename: string
) {
  if (data.length === 0) {
    console.warn("No data to export")
    return
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.json`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format data for Excel export
 * Returns a tab-separated values (TSV) string that Excel can open
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: { key: string; label: string }[],
  filename: string,
  options?: {
    title?: string
    subtitle?: string
    sheetName?: string
  }
) {
  if (data.length === 0) {
    console.warn("No data to export")
    return
  }

  const title = options?.title || "Reporte exportado"
  const subtitle = options?.subtitle || `Generado el ${new Date().toLocaleString("es-PE")}`
  const sheetName = options?.sheetName || "Reporte"

  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")

  const formatCell = (value: unknown) => {
    if (value == null) return ""
    if (value instanceof Date) return value.toLocaleDateString("es-PE")
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  }

  const colGroup = columns
    .map((col) => {
      const rawLength = Math.max(
        col.label.length,
        ...data.map((row) => formatCell(row[col.key]).length)
      )
      const width = Math.min(Math.max(rawLength + 4, 14), 34)
      return `<col style="width:${width}ch" />`
    })
    .join("")

  const headerCells = columns
    .map(
      (col) =>
        `<th>${escapeHtml(col.label)}</th>`
    )
    .join("")

  const bodyRows = data
    .map((row, rowIndex) => {
      const cells = columns
        .map((col) => `<td>${escapeHtml(formatCell(row[col.key]))}</td>`)
        .join("")

      return `<tr class="${rowIndex % 2 === 0 ? "row-even" : "row-odd"}">${cells}</tr>`
    })
    .join("")

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <meta name="ProgId" content="Excel.Sheet" />
        <meta name="Generator" content="SIAME" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${escapeHtml(sheetName)}</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; margin: 24px; color: #1f2937; }
          .report-title { font-size: 20pt; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .report-subtitle { font-size: 10pt; color: #64748b; margin-bottom: 18px; }
          .summary { margin-bottom: 14px; font-size: 10pt; color: #334155; }
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          th { background: #1d4ed8; color: #ffffff; font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 10px 8px; border: 1px solid #bfdbfe; }
          td { border: 1px solid #dbeafe; padding: 8px; font-size: 10pt; vertical-align: top; word-wrap: break-word; }
          .row-even td { background: #f8fbff; }
          .row-odd td { background: #ffffff; }
        </style>
      </head>
      <body>
        <div class="report-title">${escapeHtml(title)}</div>
        <div class="report-subtitle">${escapeHtml(subtitle)}</div>
        <div class="summary">Total de registros exportados: <strong>${data.length}</strong></div>
        <table>
          <colgroup>${colGroup}</colgroup>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `

  const bom = "\uFEFF"
  const blob = new Blob([bom + html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.xls`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Get export filename with timestamp
 */
export function getExportFilename(baseName: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const seconds = String(now.getSeconds()).padStart(2, "0")

  return `${baseName}_${year}${month}${day}_${hours}${minutes}${seconds}`
}
