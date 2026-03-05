"use client"

import { useState } from "react"
import { signOut, useSession, update } from "next-auth/react"
import { useFetchWithAbort } from "@/lib/hooks/useFetchWithAbort"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Icon from "@/components/ui/Icon"
import { toast } from "sonner"
import type { Role } from "@prisma/client"

interface User {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: Date
  updatedAt: Date
  _count: {
    documents: number
    guiasValija: number
    hojasRemision: number
  }
}

interface UsersClientProps {
  currentUserId: string
  currentUserRole: Role
}

interface ActiveSession {
  id: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  lastSeenAt: string
  expiresAt: string
}

const roleColors: Record<Role, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800",
  ADMIN: "bg-blue-100 text-blue-800",
  USER: "bg-gray-100 text-gray-800",
}

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  USER: "Usuario",
}

export default function UsersClient({ currentUserId, currentUserRole }: UsersClientProps) {
  const { data: session } = useSession()

  // Use custom hook for fetching users
  const { data: usersData, loading, refetch } = useFetchWithAbort<User[]>({
    fetchFn: async (signal) => {
      const response = await fetch("/api/admin/users", { signal })
      if (!response.ok) throw new Error("Failed to fetch users")
      return response.json()
    },
    onError: (err) => toast.error("Error al cargar usuarios"),
    deps: [],
  })
  const users = Array.isArray(usersData) ? usersData : []
  const fetchUsers = refetch

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [isEditingSelf, setIsEditingSelf] = useState(false)
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false)
  const [sessionsTarget, setSessionsTarget] = useState<User | null>(null)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER" as Role,
  })

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear usuario")
      }

      toast.success("Usuario creado correctamente")
      setCreateDialogOpen(false)
      resetForm()
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Error al crear usuario")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return

    setSaving(true)

    try {
      // Don't send role when editing self (security)
      const updateData = isEditingSelf
        ? {
            name: formData.name,
            email: formData.email,
          }
        : {
            name: formData.name,
            email: formData.email,
            role: formData.role,
          }

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar usuario")
      }

      // If editing self, update the session
      if (isEditingSelf && session?.user) {
        // Update NextAuth session
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...session,
            user: {
              ...session.user,
              name: formData.name,
              email: formData.email,
            }
          })
        })

        // Trigger session refresh
        await update({
          ...session,
          user: {
            ...session.user,
            name: formData.name,
            email: formData.email,
          }
        })
      }

      toast.success("Usuario actualizado correctamente")
      setEditDialogOpen(false)
      setSelectedUser(null)
      setIsEditingSelf(false)
      resetForm()
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar usuario")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser() {
    if (!deleteConfirm) return

    try {
      const response = await fetch(`/api/admin/users/${deleteConfirm.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar usuario")
      }

      toast.success("Usuario eliminado correctamente")
      setDeleteConfirm(null)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar usuario")
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error("La nueva contraseña debe ser diferente a la actual.")
      return
    }

    const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/
    if (!passwordPolicy.test(passwordData.newPassword)) {
      toast.error("La nueva contraseña debe tener al menos 12 caracteres, incluyendo mayúscula, minúscula y número.")
      return
    }

    setSaving(true)

    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cambiar contraseña")
      }

      if (data.requireReauth) {
        toast.success("Contraseña cambiada. Debes iniciar sesión nuevamente.")
        await signOut({ callbackUrl: "/auth/signin?message=password-updated" })
        return
      }

      toast.success("Contraseña cambiada correctamente")
      setPasswordDialogOpen(false)
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar contraseña")
    } finally {
      setSaving(false)
    }
  }

  async function handleRevokeSessions(user: User) {
    try {
      const endpoint =
        user.id === currentUserId
          ? "/api/user/sessions/revoke"
          : `/api/admin/users/${user.id}/sessions/revoke`

      const response = await fetch(endpoint, { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "No se pudo revocar las sesiones")
      }

      if (user.id === currentUserId) {
        toast.success("Sesiones revocadas. Debes volver a iniciar sesión.")
        await signOut({ callbackUrl: "/auth/signin" })
        return
      }

      toast.success("Sesiones del usuario revocadas")
    } catch (error: any) {
      toast.error(error.message || "No se pudo revocar las sesiones")
    }
  }

  async function openSessionsDialog(user: User) {
    setSessionsTarget(user)
    setSessionsDialogOpen(true)
    setSessionsLoading(true)
    try {
      const endpoint =
        user.id === currentUserId
          ? "/api/user/sessions"
          : `/api/admin/users/${user.id}/sessions`

      const response = await fetch(endpoint)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "No se pudo cargar sesiones activas")
      }

      setActiveSessions(Array.isArray(data.sessions) ? data.sessions : [])
    } catch (error: any) {
      toast.error(error.message || "No se pudo cargar sesiones activas")
      setActiveSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  async function handleRevokeSingleSession(sessionId: string) {
    if (!sessionsTarget) return

    try {
      const endpoint =
        sessionsTarget.id === currentUserId
          ? `/api/user/sessions/${sessionId}/revoke`
          : `/api/admin/users/${sessionsTarget.id}/sessions/${sessionId}/revoke`

      const response = await fetch(endpoint, { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "No se pudo cerrar la sesión")
      }

      setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success("Sesión cerrada correctamente")

      if (sessionsTarget.id === currentUserId && session?.user?.sessionId === sessionId) {
        await signOut({ callbackUrl: "/auth/signin" })
      }
    } catch (error: any) {
      toast.error(error.message || "No se pudo cerrar la sesión")
    }
  }

  function openEditDialog(user: User) {
    const editingSelf = user.id === currentUserId
    setIsEditingSelf(editingSelf)

    setSelectedUser(user)
    setFormData({
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role,
    })
    setEditDialogOpen(true)
  }

  function openPasswordDialog() {
    setPasswordDialogOpen(true)
  }

  function resetForm() {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "USER",
    })
  }

  function canManageUser(targetRole: Role): boolean {
    if (currentUserRole === "SUPER_ADMIN") return true
    if (currentUserRole === "ADMIN") return targetRole === "USER"
    return false
  }

  function canAssignRole(role: Role): boolean {
    if (currentUserRole === "SUPER_ADMIN") return true
    if (currentUserRole === "ADMIN") return role === "USER"
    return false
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-[var(--kt-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[var(--kt-text-muted)]">Cargando usuarios...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Usuarios del Sistema</CardTitle>
            <div className="text-sm text-muted-foreground">
              {users.length} usuarios registrados
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableCaption>
                Lista de usuarios del sistema ({users.length} registros)
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-center">Documentos</TableHead>
                  <TableHead className="text-center">Guías</TableHead>
                  <TableHead className="text-center">Hojas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name || "-"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {user._count.documents}
                    </TableCell>
                    <TableCell className="text-center">
                      {user._count.guiasValija}
                    </TableCell>
                    <TableCell className="text-center">
                      {user._count.hojasRemision}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit own profile button */}
                        {user.id === currentUserId && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Icon name="refresh" size="sm" className="mr-2" />
                              Perfil
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={openPasswordDialog}
                            >
                              <Icon name="lock" size="sm" className="mr-2" />
                              Contraseña
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevokeSessions(user)}
                            >
                              <Icon name="refresh" size="sm" className="mr-2" />
                              Cerrar sesiones
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSessionsDialog(user)}
                            >
                              <Icon name="users" size="sm" className="mr-2" />
                              Sesiones activas
                            </Button>
                          </>
                        )}

                        {/* Edit other users button */}
                        {canManageUser(user.role) && user.id !== currentUserId && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Icon name="refresh" size="sm" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeSessions(user)}
                            >
                              <Icon name="lock" size="sm" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openSessionsDialog(user)}
                            >
                              <Icon name="users" size="sm" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(user)}
                              className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                            >
                              <Icon name="trash" size="sm" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={sessionsDialogOpen} onOpenChange={setSessionsDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>
              Sesiones activas {sessionsTarget ? `de ${sessionsTarget.email}` : ""}
            </DialogTitle>
            <DialogDescription>
              Puedes cerrar sesiones específicas sin forzar cierre global.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>Dispositivo / Navegador</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Última actividad</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      Cargando sesiones...
                    </TableCell>
                  </TableRow>
                )}
                {!sessionsLoading && activeSessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No hay sesiones activas registradas
                    </TableCell>
                  </TableRow>
                )}
                {!sessionsLoading &&
                  activeSessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.ipAddress || "-"}</TableCell>
                      <TableCell className="max-w-[280px] truncate" title={s.userAgent || "-"}>
                        {s.userAgent || "-"}
                        {session?.user?.sessionId === s.id && sessionsTarget?.id === currentUserId && (
                          <Badge className="ml-2 bg-emerald-100 text-emerald-800">Actual</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(s.createdAt).toLocaleString("es-PE")}</TableCell>
                      <TableCell>{new Date(s.lastSeenAt).toLocaleString("es-PE")}</TableCell>
                      <TableCell>{new Date(s.expiresAt).toLocaleString("es-PE")}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeSingleSession(s.id)}
                        >
                          Cerrar sesión
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario en el sistema. La contraseña debe tener al menos 12 caracteres, una mayúscula, una minúscula y un número.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  minLength={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={12}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as Role })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Usuario</SelectItem>
                    {canAssignRole("ADMIN") && (
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                    )}
                    {canAssignRole("SUPER_ADMIN") && (
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creando..." : "Crear Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditingSelf ? "Editar Mi Perfil" : "Editar Usuario"}</DialogTitle>
            <DialogDescription>
              {isEditingSelf
                ? "Actualiza tu información personal. No puedes cambiar tu propio rol."
                : "Actualiza la información del usuario."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  minLength={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              {!isEditingSelf && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Rol</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as Role })}
                  >
                    <SelectTrigger id="edit-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Usuario</SelectItem>
                      {canAssignRole("ADMIN") && (
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                      )}
                      {canAssignRole("SUPER_ADMIN") && (
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isEditingSelf && (
                <div className="grid gap-2">
                  <Label>Rol</Label>
                  <div className="px-3 py-2 bg-[var(--kt-gray-100)] rounded-md text-sm text-[var(--kt-text-muted)]">
                    {roleLabels[formData.role]}
                  </div>
                  <p className="text-xs text-[var(--kt-text-muted)]">
                    No puedes cambiar tu propio rol por razones de seguridad.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Actualizando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar al usuario <strong>{deleteConfirm?.email}</strong>?
              Esta acción no se puede deshacer y se eliminarán todos los documentos y registros asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-[var(--kt-danger)] hover:bg-[var(--kt-danger-dark)]"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Actualiza tu contraseña. Asegúrate de recordar la nueva contraseña.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Contraseña Actual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={12}
                />
                <p className="text-xs text-[var(--kt-text-muted)]">
                  Mínimo 12 caracteres, una mayúscula, una minúscula y un número.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={12}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Cambiando..." : "Cambiar Contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Create */}
      {currentUserRole === "SUPER_ADMIN" && (
        <div className="fixed bottom-6 right-6">
          <Button
            size="lg"
            onClick={() => {
              resetForm()
              setCreateDialogOpen(true)
            }}
            className="shadow-lg"
          >
            <Icon name="plus" className="mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      )}
    </>
  )
}
