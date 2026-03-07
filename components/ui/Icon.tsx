/**
 * Icon Component - Optimized with lucide-react tree-shaking
 *
 * All icons now use lucide-react for automatic tree-shaking.
 * This reduces bundle size by only importing icons that are actually used.
 */

import * as LucideIcons from "lucide-react"
import { logger } from "@/lib/logger"
import { forwardRef } from "react"

interface IconProps {
  name: string
  className?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
}

// Mapping from custom icon names to lucide-react icon names
const iconMap: Record<string, keyof typeof LucideIcons> = {
  home: "Home",
  document: "FileText",
  "file-text": "FileText",
  suitcase: "Briefcase",
  shipping: "Package",
  package: "Package",
  download: "Download",
  chart: "BarChart3",
  menu: "Menu",
  x: "X",
  bell: "Bell",
  user: "User",
  logout: "LogOut",
  calendar: "Calendar",
  truck: "Truck",
  weight: "Weight",
  mapPin: "MapPin",
  "map-pin": "MapPin",
  chevronLeft: "ChevronLeft",
  chevronRight: "ChevronRight",
  refresh: "RefreshCw",
  edit: "Pencil",
  pencil: "Pencil",
  search: "Search",
  plus: "Plus",
  trash: "Trash2",
  eye: "Eye",
  check: "Check",
  alert: "AlertTriangle",
  upload: "Upload",
  lock: "Lock",
  users: "Users",
  shield: "Shield",
  table: "Table",
  "chevron-up": "ChevronUp",
  "chevron-down": "ChevronDown",
  "chevron-left": "ChevronLeft",
  "chevron-right": "ChevronRight",
  "double-chevrons-left": "ChevronsLeft",
  "double-chevrons-right": "ChevronsRight",
  chevronUp: "ChevronUp",
  chevronDown: "ChevronDown",
  chevronsLeft: "ChevronsLeft",
  chevronsRight: "ChevronsRight",
}

function resolveIconName(name: string): keyof typeof LucideIcons | undefined {
  if (iconMap[name]) return iconMap[name]

  const lowerName = name.toLowerCase()
  if (iconMap[lowerName]) return iconMap[lowerName]

  const kebabName = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
  if (iconMap[kebabName]) return iconMap[kebabName]

  const camelName = name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
  if (iconMap[camelName]) return iconMap[camelName]

  return undefined
}

export const Icon = forwardRef<HTMLSpanElement, IconProps>(
  ({ name, className = "", size = "md" }, ref) => {
    const lucideIconName = resolveIconName(name)

    if (!lucideIconName) {
      logger.warn(`Icon "${name}" not found in mapping`)
      return null
    }

    // Get the icon component from lucide-react (tree-shaken)
    const IconComponent = LucideIcons[lucideIconName]

    if (!IconComponent) {
      logger.warn(`Lucide icon "${lucideIconName}" not found`)
      return null
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}
      >
        <IconComponent className="w-full h-full" strokeWidth={2} />
      </span>
    )
  }
)

Icon.displayName = "Icon"

export default Icon
