"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import Icon from "@/components/ui/Icon"
import Button from "@/components/ui/Button"

interface HeaderProps {
  session: any
  toggleSidebar: () => void
  toggleMobileMenu: () => void
}

export default function Header({ session, toggleSidebar, toggleMobileMenu }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/signin" })
  }

  return (
    <header className="bg-white border-b border-[var(--kt-gray-200)] sticky top-0 z-20">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left: Mobile menu toggle + Breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <Icon name="menu" />
          </button>

          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold text-[var(--kt-text-dark)]">
              Dashboard
            </h1>
          </div>
        </div>

        {/* Right: Notifications + User menu */}
        <div className="flex items-center gap-4">
          {/* Notifications (placeholder) */}
          <button className="relative p-2 rounded-md hover:bg-gray-100">
            <Icon name="bell" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[var(--kt-danger)]"></span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100"
            >
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-[var(--kt-text-dark)]">
                  {session.user?.name || "Usuario"}
                </p>
                <p className="text-xs text-[var(--kt-text-muted)]">
                  {session.user?.email}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-[var(--kt-primary)] flex items-center justify-center text-white font-semibold">
                {(session.user?.name || "U")[0].toUpperCase()}
              </div>
            </button>

            {/* User dropdown */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-[var(--kt-gray-200)] py-1 z-20">
                  <div className="px-4 py-3 border-b border-[var(--kt-gray-200)]">
                    <p className="text-sm font-medium text-[var(--kt-text-dark)]">
                      {session.user?.name || "Usuario"}
                    </p>
                    <p className="text-xs text-[var(--kt-text-muted)] truncate">
                      {session.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-sm text-[var(--kt-text-muted)] hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Icon name="logout" size="sm" />
                    Cerrar Sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
