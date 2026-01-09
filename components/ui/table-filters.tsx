import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import Icon from "@/components/ui/Icon"
import { cn } from "@/lib/utils"

export interface TableFilters {
  search?: string
  estado?: string
  tipo?: string
  fechaDesde?: string
  fechaHasta?: string
}

interface TableFiltersProps {
  filters: TableFilters
  onFiltersChange: (filters: TableFilters) => void
  onClearFilters: () => void
  estados?: { value: string; label: string }[]
  tipos?: { value: string; label: string }[]
}

export function TableFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  estados,
  tipos,
}: TableFiltersProps) {
  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  const updateFilter = (key: keyof TableFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filtros Avanzados</CardTitle>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              <Icon name="x" size="sm" className="mr-2" />
              Limpiar ({activeFiltersCount})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                id="search"
                placeholder="Número, destinatario..."
                value={filters.search || ""}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Estado */}
          {estados && estados.length > 0 && (
            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={filters.estado || ""}
                onValueChange={(value) => updateFilter("estado", value)}
              >
                <SelectTrigger id="estado">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  {estados.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tipo */}
          {tipos && tipos.length > 0 && (
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={filters.tipo || ""}
                onValueChange={(value) => updateFilter("tipo", value)}
              >
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los tipos</SelectItem>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fecha Desde */}
          <div>
            <Label htmlFor="fechaDesde">Desde</Label>
            <Input
              id="fechaDesde"
              type="date"
              value={filters.fechaDesde || ""}
              onChange={(e) => updateFilter("fechaDesde", e.target.value)}
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <Label htmlFor="fechaHasta">Hasta</Label>
            <Input
              id="fechaHasta"
              type="date"
              value={filters.fechaHasta || ""}
              onChange={(e) => updateFilter("fechaHasta", e.target.value)}
            />
          </div>
        </div>

        {/* Active Filters Badges */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                Buscar: "{filters.search}"
                <button
                  onClick={() => updateFilter("search", "")}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                >
                  <Icon name="x" size="xs" />
                </button>
              </Badge>
            )}
            {filters.estado && (
              <Badge variant="secondary" className="gap-1">
                Estado: {estados?.find((e) => e.value === filters.estado)?.label}
                <button
                  onClick={() => updateFilter("estado", "")}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                >
                  <Icon name="x" size="xs" />
                </button>
              </Badge>
            )}
            {filters.tipo && (
              <Badge variant="secondary" className="gap-1">
                Tipo: {tipos?.find((t) => t.value === filters.tipo)?.label}
                <button
                  onClick={() => updateFilter("tipo", "")}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                >
                  <Icon name="x" size="xs" />
                </button>
              </Badge>
            )}
            {(filters.fechaDesde || filters.fechaHasta) && (
              <Badge variant="secondary" className="gap-1">
                {filters.fechaDesde && `Desde ${filters.fechaDesde}`}
                {filters.fechaDesde && filters.fechaHasta && " - "}
                {filters.fechaHasta && `Hasta ${filters.fechaHasta}`}
                <button
                  onClick={() => {
                    onFiltersChange({
                      ...filters,
                      fechaDesde: undefined,
                      fechaHasta: undefined,
                    })
                  }}
                  className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                >
                  <Icon name="x" size="xs" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
