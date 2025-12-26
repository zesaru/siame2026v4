import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-600 text-white hover:bg-green-700",
        warning:
          "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
        info:
          "border-transparent bg-blue-600 text-white hover:bg-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Status badge configuration for common statuses
export const StatusBadges: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"; label: string }> = {
  pendiente: { variant: "warning", label: "Pendiente" },
  en_transito: { variant: "info", label: "En Tránsito" },
  entregado: { variant: "success", label: "Entregado" },
  cancelado: { variant: "destructive", label: "Cancelado" },
  completed: { variant: "success", label: "Completado" },
  failed: { variant: "destructive", label: "Fallido" },
  processing: { variant: "info", label: "Procesando" },
  pending: { variant: "warning", label: "Pendiente" },
  borrador: { variant: "secondary", label: "Borrador" },
  enviada: { variant: "default", label: "Enviada" },
  recibida: { variant: "success", label: "Recibida" },
  anulada: { variant: "destructive", label: "Anulada" },
}

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = StatusBadges[status] || { variant: "secondary" as const, label: status }

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  )
}

export { Badge, badgeVariants }
