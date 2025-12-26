"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Sidebar from "./Sidebar.tsx"
import Header from "./Header.tsx"

interface DashboardLayoutProps {
  children: React.ReactNode
  session: any
}

export default function DashboardLayout({ children, session }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[var(--kt-gray-50)]">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        currentPath={pathname}
      />

      {/* Main Content */}
      <div
        className={`
          transition-all duration-300
          ${sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"}
        `}
      >
        {/* Header */}
        <Header
          session={session}
          toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          toggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
