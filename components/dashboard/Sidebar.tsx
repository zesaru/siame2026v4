"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Icon from "@/components/ui/Icon"

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  currentPath: string
}

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "home",
  },
  {
    title: "Documentos",
    href: "/dashboard/documents",
    icon: "document",
  },
  {
    title: "Guías de Valija",
    href: "/dashboard/guias-valija",
    icon: "suitcase",
  },
  {
    title: "Hojas de Remisión",
    href: "/dashboard/hojas-remision",
    icon: "shipping",
  },
]

export default function Sidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  currentPath,
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Sidebar (Drawer) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-64 bg-white
          transform transition-transform duration-300
          lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-[var(--kt-gray-200)]">
            <span className="text-xl font-bold text-[var(--kt-primary)]">SIAME</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <Icon name="x" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = currentPath === item.href || currentPath.startsWith(item.href + "/")

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3
                    rounded-lg font-medium text-sm
                    transition-colors duration-200
                    ${
                      isActive
                        ? "bg-[var(--kt-primary-light)] text-[var(--kt-primary-dark)]"
                        : "text-[var(--kt-text-muted)] hover:bg-[var(--kt-gray-100)] hover:text-[var(--kt-text-dark)]"
                    }
                  `}
                >
                  <Icon name={item.icon} />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30
          bg-white border-r border-[var(--kt-gray-200)]
          transition-all duration-300
          hidden lg:block
          ${collapsed ? "w-16" : "w-64"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-[var(--kt-gray-200)]">
            {!collapsed && <span className="text-xl font-bold text-[var(--kt-primary)]">SIAME</span>}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:block p-2 rounded-md hover:bg-gray-100"
            >
              <Icon name={collapsed ? "chevronRight" : "chevronLeft"} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = currentPath === item.href || currentPath.startsWith(item.href + "/")

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.title : undefined}
                  className={`
                    flex items-center gap-3 px-4 py-3
                    rounded-lg font-medium text-sm
                    transition-colors duration-200
                    ${
                      isActive
                        ? "bg-[var(--kt-primary-light)] text-[var(--kt-primary-dark)]"
                        : "text-[var(--kt-text-muted)] hover:bg-[var(--kt-gray-100)] hover:text-[var(--kt-text-dark)]"
                    }
                  `}
                >
                  <Icon name={item.icon} />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
