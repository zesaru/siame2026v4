"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import Icon from "@/components/ui/Icon"

interface KeyValuePair {
  key: string
  value: string
  confidence?: number
  boundingRegions?: any[]
}

interface KeyValueEditorProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  keyValuePairs: KeyValuePair[]
  onSave: (updatedPairs: KeyValuePair[]) => void
}

export default function KeyValueEditor({
  isOpen,
  onClose,
  documentId,
  keyValuePairs,
  onSave,
}: KeyValueEditorProps) {
  const [editedPairs, setEditedPairs] = useState<KeyValuePair[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize with props data when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditedPairs(keyValuePairs.map(pair => ({...pair})))
      setError(null)
    }
  }, [isOpen, keyValuePairs])

  const handleFieldChange = (index: number, field: 'key' | 'value', newValue: string) => {
    const updated = [...editedPairs]
    updated[index] = {
      ...updated[index],
      [field]: newValue
    }
    setEditedPairs(updated)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyValuePairs: editedPairs
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update document")
      }

      const updated = await response.json()
      onSave(updated.keyValuePairs)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar cambios")
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Editar Key-Value Pairs</DialogTitle>
          <DialogDescription>
            Corrige los datos extraídos del documento antes de guardar como Guía de Valija
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-muted-foreground pb-2 border-b">
              <div className="col-span-5">Key</div>
              <div className="col-span-5">Value</div>
              <div className="col-span-2 text-center">Confianza</div>
            </div>

            {editedPairs.map((pair, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-5">
                  <Input
                    value={pair.key}
                    onChange={(e) => handleFieldChange(index, 'key', e.target.value)}
                    placeholder="Key"
                    className="text-sm"
                  />
                </div>
                <div className="col-span-5">
                  <Input
                    value={pair.value}
                    onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="text-sm"
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  {pair.confidence && (
                    <Badge variant={getConfidenceColor(pair.confidence)}>
                      {Math.round(pair.confidence * 100)}%
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {editedPairs.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No hay key-value pairs para editar
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || editedPairs.length === 0}
          >
            {isSaving ? (
              <>
                <Icon name="loading" className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Icon name="save" className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
