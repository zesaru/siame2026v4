"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Trash2, Plus, Package } from "lucide-react"
import { toast } from "sonner"

interface GuiaValijaItem {
  numeroItem: number
  destinatario: string
  contenido: string
  remitente?: string
  cantidad?: number
  peso?: number
}

interface GuiaValijaItemsProps {
  items?: GuiaValijaItem[]
  onChange?: (items: GuiaValijaItem[]) => void
  validateRef?: React.Ref<{ validate: () => boolean }>
  editable?: boolean
  title?: string
}

export default function GuiaValijaItems({
  items = [],
  onChange,
  validateRef,
  editable = true,
  title = "Items de la Guía de Valija"
}: GuiaValijaItemsProps) {
  const [localItems, setLocalItems] = useState<GuiaValijaItem[]>(items)
  const [error, setError] = useState("")

  // Si no hay componente padre manejando los cambios, usamos local state
  const controlled = onChange !== undefined
  const [internalItems, setInternalItems] = useState<GuiaValijaItem[]>(items)

  const currentItems = controlled ? localItems : internalItems

  const validateItems = () => {
    if (currentItems.length === 0) {
      setError("Debe agregar al menos un item")
      return false
    }

    for (let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i]
      if (!item.destinatario?.trim()) {
        setError(`El destinatario del item ${i + 1} es requerido`)
        return false
      }
      if (!item.contenido?.trim()) {
        setError(`El contenido del item ${i + 1} es requerido`)
        return false
      }
    }

    setError("")
    return true
  }

  // Exponer la función de validación en el ref
  useImperativeHandle(validateRef, () => ({
    validate: validateItems,
    validateItems: validateItems,
  }), [validateItems])

  const addItem = () => {
    const newItem: GuiaValijaItem = {
      numeroItem: currentItems.length + 1,
      destinatario: "",
      contenido: "",
      remitente: "",
      cantidad: undefined,
      peso: undefined,
    }

    const newItems = [...currentItems, newItem]
    updateItems(newItems)
  }

  const removeItem = (index: number) => {
    const newItems = currentItems.filter((_, i) => i !== index)
    // Re-numerar items
    const renumberedItems = newItems.map((item, i) => ({
      ...item,
      numeroItem: i + 1,
    }))
    updateItems(renumberedItems)
  }

  const updateItem = (index: number, field: keyof GuiaValijaItem, value: any) => {
    const newItems = [...currentItems]
    newItems[index] = { ...newItems[index], [field]: value }
    updateItems(newItems)
  }

  const updateItems = (newItems: GuiaValijaItem[]) => {
    if (controlled) {
      setLocalItems(newItems)
      onChange?.(newItems)
    } else {
      setInternalItems(newItems)
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          Lista de items contenidos en la guía de valija
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Items Table */}
        <div className="space-y-3">
          {currentItems.map((item, index) => (
            <div key={item.numeroItem} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
              <div className="col-span-1">
                <Label className="text-xs font-medium">Nº</Label>
                <Input
                  value={item.numeroItem}
                  disabled
                  className="text-center"
                />
              </div>

              <div className="col-span-3">
                <Label className="text-xs font-medium">Destinatario</Label>
                <Input
                  value={item.destinatario}
                  onChange={(e) => updateItem(index, "destinatario", e.target.value)}
                  placeholder="Destinatario"
                />
              </div>

              <div className="col-span-4">
                <Label className="text-xs font-medium">Contenido</Label>
                <Input
                  value={item.contenido}
                  onChange={(e) => updateItem(index, "contenido", e.target.value)}
                  placeholder="Descripción del contenido"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-medium">Cant.</Label>
                <Input
                  type="number"
                  value={item.cantidad || ""}
                  onChange={(e) => updateItem(index, "cantidad", e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="Cant."
                />
              </div>

              <div className="col-span-1">
                <Label className="text-xs font-medium">Peso</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.peso || ""}
                  onChange={(e) => updateItem(index, "peso", e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Kg"
                />
              </div>

              {editable && (
                <div className="col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          {editable && (
            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Item
            </Button>
          )}
        </div>

        {/* Summary */}
        {currentItems.length > 0 && (
          <div className="mt-4 p-3 bg-[var(--kt-gray-50)] rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-[var(--kt-text-muted)]">Total Items:</span>
                <span className="ml-2 font-medium">{currentItems.length}</span>
              </div>
              <div>
                <span className="text-[var(--kt-text-muted)]">Total Peso:</span>
                <span className="ml-2 font-medium">
                  {currentItems.reduce((sum, item) => sum + (item.peso || 0), 0).toFixed(2)} kg
                </span>
              </div>
              <div>
                <span className="text-[var(--kt-text-muted)]">Total Unidades:</span>
                <span className="ml-2 font-medium">
                  {currentItems.reduce((sum, item) => sum + (item.cantidad || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}