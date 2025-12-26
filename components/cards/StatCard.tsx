import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import * as LucideIcons from "lucide-react"

interface StatCardProps {
  title: string
  value: number | string
  description?: string
  trend?: {
    value: string
    period: string
    positive: boolean
  }
  icon?: string
  color?: "primary" | "success" | "warning" | "danger" | "info"
  loading?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

// Icon name mapping to lucide-react components
const iconMap: Record<string, keyof typeof LucideIcons> = {
  document: "FileText",
  suitcase: "Briefcase",
  shipping: "Truck",
  check: "Check",
  // Add more mappings as needed
}

const colorClasses = {
  primary: {
    bg: "bg-[var(--kt-primary-light)]",
    text: "text-[var(--kt-primary)]",
    iconBg: "bg-[var(--kt-primary)]",
    iconText: "text-white",
  },
  success: {
    bg: "bg-[var(--kt-success-light)]",
    text: "text-[var(--kt-success)]",
    iconBg: "bg-[var(--kt-success)]",
    iconText: "text-white",
  },
  warning: {
    bg: "bg-[var(--kt-warning-light)]",
    text: "text-[var(--kt-warning)]",
    iconBg: "bg-[var(--kt-warning)]",
    iconText: "text-[var(--kt-text-dark)]",
  },
  danger: {
    bg: "bg-[var(--kt-danger-light)]",
    text: "text-[var(--kt-danger)]",
    iconBg: "bg-[var(--kt-danger)]",
    iconText: "text-white",
  },
  info: {
    bg: "bg-[var(--kt-info-light)]",
    text: "text-[var(--kt-info)]",
    iconBg: "bg-[var(--kt-info)]",
    iconText: "text-white",
  },
}

export default function StatCard({
  title,
  value,
  description,
  trend,
  icon,
  color = "primary",
  loading = false,
  action,
}: StatCardProps) {
  const colors = colorClasses[color]

  // Get the icon component from lucide-react
  const IconComponent = icon && iconMap[icon] ? LucideIcons[iconMap[icon]] : null

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--kt-text-muted)] mb-1">
              {title}
            </p>
            <h3 className={`text-3xl font-bold ${colors.text} mb-1`}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </h3>

            {description && (
              <p className="text-sm text-[var(--kt-text-muted)] mb-2">
                {description}
              </p>
            )}

            {trend && (
              <div className="flex items-center gap-1 text-sm">
                <span
                  className={`font-medium ${
                    trend.positive ? "text-[var(--kt-success)]" : "text-[var(--kt-danger)]"
                  }`}
                >
                  {trend.positive ? "↑" : "↓"} {trend.value}
                </span>
                <span className="text-[var(--kt-text-muted)]">{trend.period}</span>
              </div>
            )}
          </div>

          {icon && IconComponent && (
            <div className={`flex-shrink-0 h-12 w-12 rounded-lg ${colors.iconBg} ${colors.iconText} flex items-center justify-center`}>
              <IconComponent className="h-6 w-6" />
            </div>
          )}
        </div>

        {action && (
          <div className="mt-4 pt-4 border-t border-[var(--kt-gray-200)]">
            <button
              onClick={action.onClick}
              className={`text-sm font-medium ${colors.text} hover:underline`}
            >
              {action.label} →
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
