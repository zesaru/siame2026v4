import { useState, useMemo } from "react"

export interface PaginationConfig {
  currentPage: number
  itemsPerPage: number
  totalItems: number
}

/**
 * Hook to handle table pagination
 *
 * @example
 * ```tsx
 * function MyTable() {
 *   const { currentPage, paginatedData, totalPages, goToPage, nextPage, prevPage } =
 *     useTablePagination(data, { itemsPerPage: 10 })
 *
 *   return (
 *     <>
 *       <table>
 *         {paginatedData.map(row => <tr key={row.id}>...</tr>)}
 *       </table>
 *       <Pagination
 *         currentPage={currentPage}
 *         totalPages={totalPages}
 *         onPageChange={goToPage}
 *       />
 *     </>
 *   )
 * }
 * ```
 */
export function useTablePagination<T>(
  data: T[],
  options?: {
    itemsPerPage?: number
    initialPage?: number
  }
) {
  const itemsPerPage = options?.itemsPerPage || 10
  const [currentPage, setCurrentPage] = useState(options?.initialPage || 1)

  const totalPages = Math.ceil(data.length / itemsPerPage)

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, itemsPerPage])

  const goToPage = (page: number) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(pageNumber)
  }

  const nextPage = () => {
    goToPage(currentPage + 1)
  }

  const prevPage = () => {
    goToPage(currentPage - 1)
  }

  const firstPage = () => {
    goToPage(1)
  }

  const lastPage = () => {
    goToPage(totalPages)
  }

  const canGoNext = currentPage < totalPages
  const canGoPrev = currentPage > 1

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    canGoNext,
    canGoPrev,
  }
}
