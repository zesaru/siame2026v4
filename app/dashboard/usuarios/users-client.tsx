"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
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
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER" as Role,
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const response = await fetch("/api/admin/users")
      if (!response.ok) throw new Error("Failed to fetch users")
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      toast.error("Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

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
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar usuario")
      }

      toast.success("Usuario actualizado correctamente")
      setEditDialogOpen(false)
      setSelectedUser(null)
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

  function openEditDialog(user: User) {
    setSelectedUser(user)
    setFormData({
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role,
    })
    setEditDialogOpen(true)
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
                              onClick={() => setDeleteConfirm(user)}
                              className="text-[var(--kt-danger)] hover:text-[var(--kt-danger)]"
                            >
                              <Icon name="trash" size="sm" />
                            </Button>
                          </>
                        )}
                        {user.id === currentUserId && (
                          <Badge variant="outline">Tú</Badge>
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

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario en el sistema. La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.
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
                  minLength={8}
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
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Actualiza la información del usuario.
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
