import { Button } from "@/components/ui/button"
import Icon from "@/components/ui/Icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DataTablePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  itemsPerPageOptions?: number[]
}

export function DataTablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 20, 50, 100],
}: DataTablePaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push("...")
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push("...")
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push("...")
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push("...")
        pages.push(totalPages)
      }
    }
    return pages
  }

  return (
    <div className="flex items-center justify-between px-2 py-4">
      {/* Info */}
      <div className="text-sm text-muted-foreground">
        Mostrando{" "}
        <span className="font-medium">
          {totalItems > 0 ? startItem : 0}
        </span>{" "}
        a{" "}
        <span className="font-medium">{endItem}</span> de{" "}
        <span className="font-medium">{totalItems}</span> resultados
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Items per page */}
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filas:</span>
            <Select
              value={String(itemsPerPage)}
              onValueChange={(value) => onItemsPerPageChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            <Icon name="double-chevrons-left" size="sm" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <Icon name="chevron-left" size="sm" />
          </Button>

          {getPageNumbers().map((page, index) => (
            <Button
              key={index}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={typeof page !== "number"}
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <Icon name="chevron-right" size="sm" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <Icon name="double-chevrons-right" size="sm" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface SortableHeaderProps {
  children: React.ReactNode
  isSorted: boolean
  sortDirection: "asc" | "desc" | null
  onSort: () => void
  className?: string
}

export function SortableHeader({
  children,
  isSorted,
  sortDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 cursor-pointer select-none group",
        isSorted && "text-[var(--kt-primary)]",
        className
      )}
      onClick={onSort}
    >
      <span className="flex-1">{children}</span>
      <div className="flex flex-col">
        <Icon
          name="chevron-up"
          size="xs"
          className={cn(
            "text-gray-400",
            sortDirection === "asc" && "text-[var(--kt-primary)]"
          )}
        />
        <Icon
          name="chevron-down"
          size="xs"
          className={cn(
            "-mt-2 text-gray-400",
            sortDirection === "desc" && "text-[var(--kt-primary)]"
          )}
        />
      </div>
    </div>
  )
}
