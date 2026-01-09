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
  filename: string
) {
  if (data.length === 0) {
    console.warn("No data to export")
    return
  }

  // Create header row
  const headers = columns.map((col) => col.label).join("\t")

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
          return JSON.stringify(value)
        }

        return String(value)
      })
      .join("\t")
  })

  // Combine header and rows
  const tsv = [headers, ...rows].join("\n")

  // Add BOM for Excel to recognize UTF-8 correctly
  const bom = "\uFEFF"
  const blob = new Blob([bom + tsv], { type: "text/tab-separated-values;charset=utf-8;" })
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
