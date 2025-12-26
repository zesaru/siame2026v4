"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Icon from "@/components/ui/Icon"

export default function SignIn() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Credenciales inválidas. Por favor verifica tu email y contraseña.")
      } else {
        router.push("/dashboard")
      }
    } catch {
      setError("Error al iniciar sesión. Por favor intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--kt-gray-50)] p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--kt-primary)] mb-4">
            <span className="text-3xl font-bold text-white">S</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--kt-text-dark)]">SIAME 2026</h1>
          <p className="text-sm text-[var(--kt-text-muted)] mt-1">
            Sistema de Inteligencia Artificial para Misiones diplomáticas
          </p>
        </div>

        {/* Sign In Card */}
        <Card className="shadow-[var(--kt-shadow-card)]">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>

              {error && (
                <Alert variant="destructive" className="bg-[var(--kt-danger-light)] border-[var(--kt-danger)] text-[var(--kt-danger)]">
                  <Icon name="alert" size="sm" className="mr-2" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Iniciar Sesión
                    <Icon name="chevronRight" size="sm" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-[var(--kt-text-muted)]">
              ¿No tienes una cuenta?{" "}
              <Link href="/auth/signup" className="font-medium text-[var(--kt-primary)] hover:underline">
                Regístrate aquí
              </Link>
            </div>

            {/* Demo Notice */}
            <Alert className="bg-[var(--kt-info-light)] border-[var(--kt-info)] text-[var(--kt-info)]">
              <Icon name="alert" size="sm" className="mr-2" />
              <AlertDescription className="text-sm">
                <strong>Demo:</strong> Usa cualquier email con la contraseña <code>temp123</code>
              </AlertDescription>
            </Alert>
          </CardFooter>
        </Card>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-[var(--kt-text-muted)] hover:text-[var(--kt-primary)] transition-colors"
          >
            <Icon name="chevronLeft" size="sm" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}