import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Icon from "@/components/ui/Icon"

const features = [
  {
    title: "Document Intelligence",
    description: "Análisis inteligente de documentos con Azure AI para extraer información automáticamente.",
    icon: "document",
    color: "primary",
  },
  {
    title: "Guías de Valija",
    description: "Gestión completa de documentos diplomáticos y valijas con seguimiento en tiempo real.",
    icon: "suitcase",
    color: "warning",
  },
  {
    title: "Hojas de Remisión",
    description: "Control y registro de remisiones con_items detallados y estados de seguimiento.",
    icon: "shipping",
    color: "info",
  },
]

const stats = [
  { label: "Documentos Procesados", value: "10K+" },
  { label: "Usuarios Activos", value: "500+" },
  { label: "Misiones Diplomáticas", value: "50+" },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--kt-gray-50)]">
      {/* Header */}
      <header className="border-b border-[var(--kt-gray-200)] bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--kt-primary)]">
                <span className="text-xl font-bold text-white">S</span>
              </div>
              <span className="text-xl font-bold text-[var(--kt-text-dark)]">SIAME 2026</span>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/auth/signin">
                <Button variant="ghost" className="text-[var(--kt-text-muted)]">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)]">
                  Crear Cuenta
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--kt-primary-light)] via-white to-[var(--kt-info-light)] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--kt-primary)] text-white text-sm font-medium mb-6">
              <Icon name="check" size="sm" />
              Potenciado por Azure AI
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--kt-text-dark)] leading-tight mb-6">
              Sistema Inteligente para
              <span className="text-[var(--kt-primary)]"> Misiones diplomáticas</span>
            </h1>
            <p className="text-lg sm:text-xl text-[var(--kt-text-muted)] mb-10 max-w-2xl mx-auto">
              Plataforma integral de gestión documental con inteligencia artificial para el procesamiento automático de Guías de Valija y Hojas de Remisión.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="h-12 px-8 bg-[var(--kt-primary)] hover:bg-[var(--kt-primary-dark)] text-base">
                  Comenzar Ahora
                  <Icon name="chevronRight" size="sm" />
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button size="lg" variant="outline" className="h-12 px-8 border-[var(--kt-gray-300)] text-base">
                  <Icon name="chart" size="sm" className="mr-2" />
                  Ver Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-[var(--kt-gray-200)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-[var(--kt-primary)] mb-2">{stat.value}</div>
                <div className="text-sm text-[var(--kt-text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--kt-text-dark)] mb-4">
              Características Principales
            </h2>
            <p className="text-lg text-[var(--kt-text-muted)] max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar documentos diplomáticos de manera eficiente y segura.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-[var(--kt-gray-200)] hover:shadow-[var(--kt-shadow-lg)] transition-shadow duration-300"
              >
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      feature.color === "primary"
                        ? "bg-[var(--kt-primary-light)]"
                        : feature.color === "warning"
                        ? "bg-[var(--kt-warning-light)]"
                        : "bg-[var(--kt-info-light)]"
                    }`}
                  >
                    <Icon
                      name={feature.icon as any}
                      className={
                        feature.color === "primary"
                          ? "text-[var(--kt-primary)]"
                          : feature.color === "warning"
                          ? "text-[var(--kt-warning)]"
                          : "text-[var(--kt-info)]"
                      }
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--kt-text-dark)] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--kt-text-muted)] leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-[var(--kt-primary)] to-[var(--kt-primary-dark)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            ¿Listo para transformar tu gestión documental?
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            Únete a las misiones diplomáticas que ya están utilizando SIAME 2026 para optimizar sus procesos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                Crear Cuenta Gratis
              </Button>
            </Link>
            <Link href="/dashboard/documents">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 border-white/30 text-white hover:bg-white/10 hover:text-white text-base"
              >
                Probar Document Intelligence
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[var(--kt-gray-900)] text-[var(--kt-text-light)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--kt-primary)]">
                <span className="text-sm font-bold text-white">S</span>
              </div>
              <span className="font-semibold">SIAME 2026</span>
            </div>
            <p className="text-sm text-[var(--kt-text-muted)]">
              © 2026 SIAME. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
