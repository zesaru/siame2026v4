import { useState, useMemo } from "react"

export type SortDirection = "asc" | "desc" | null

export interface SortConfig {
  key: string
  direction: SortDirection
}

/**
 * Hook to handle table column sorting
 *
 * @example
 * ```tsx
 * function MyTable() {
 *   const { sortConfig, handleSort, sortedData } = useTableSort(data, {
 *     defaultSort: { key: 'fecha', direction: 'desc' }
 *   })
 *
 *   return (
 *     <table>
 *       <thead>
 *         <tr>
 *           <th onClick={() => handleSort('nombre')}>
 *             Nombre {getSortIndicator('nombre')}
 *           </th>
 *         </tr>
 *       </thead>
 *       <tbody>
 *         {sortedData.map(row => <tr key={row.id}>...</tr>)}
 *       </tbody>
 *     </table>
 *   )
 * }
 * ```
 */
export function useTableSort<T>(
  data: T[],
  options?: {
    defaultSort?: SortConfig
  }
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(
    options?.defaultSort || { key: "", direction: null }
  )

  const handleSort = (key: string) => {
    let direction: SortDirection = "asc"

    // If already sorting by this key, cycle through directions
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc"
      } else if (sortConfig.direction === "desc") {
        direction = null // Remove sort
      }
    }

    setSortConfig({ key, direction })
  }

  const sortedData = useMemo(() => {
    if (!sortConfig.direction || !sortConfig.key) {
      return data
    }

    const sortableData = [...data]

    sortableData.sort((a: any, b: any) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return 1
      if (bValue == null) return -1

      // Handle numbers
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc"
          ? aValue - bValue
          : bValue - aValue
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        const aTime = aValue.getTime()
        const bTime = bValue.getTime()
        return sortConfig.direction === "asc" ? aTime - bTime : bTime - aTime
      }

      // Handle date strings
      if (!isNaN(Date.parse(aValue)) && !isNaN(Date.parse(bValue))) {
        const aTime = new Date(aValue).getTime()
        const bTime = new Date(bValue).getTime()
        return sortConfig.direction === "asc" ? aTime - bTime : bTime - aTime
      }

      // Handle strings (case-insensitive)
      const aString = String(aValue).toLowerCase()
      const bString = String(bValue).toLowerCase()

      if (aString < bString) {
        return sortConfig.direction === "asc" ? -1 : 1
      }
      if (aString > bString) {
        return sortConfig.direction === "asc" ? 1 : -1
      }
      return 0
    })

    return sortableData
  }, [data, sortConfig])

  const getSortIndicator = (key: string): string | null => {
    if (sortConfig.key !== key) {
      return null
    }

    if (sortConfig.direction === "asc") {
      return "↑"
    }
    if (sortConfig.direction === "desc") {
      return "↓"
    }
    return null
  }

  const isSorted = (key: string): boolean => {
    return sortConfig.key === key && sortConfig.direction !== null
  }

  return {
    sortConfig,
    handleSort,
    sortedData,
    getSortIndicator,
    isSorted,
  }
}
