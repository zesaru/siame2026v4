import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ToasterProvider } from "@/components/providers/toaster";

export const metadata: Metadata = {
  icons: {
    icon: "/icon.svg",
  },
  title: {
    default: "SIAME 2026",
    template: "%s | SIAME 2026",
  },
  description: "Plataforma integral de gestión documental para la gestión de Guías de Valija, Hojas de Remisión y documentos institucionales.",
  keywords: ["SIAME", "gestión documental", "inteligencia artificial", "Azure AI", "valija diplomática", "misiones diplomáticas", "documentos"],
  authors: [{ name: "SIAME Team" }],
  creator: "SIAME 2026",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://siame2026.com",
    title: "SIAME 2026",
    description: "Plataforma integral de gestión documental institucional",
    siteName: "SIAME 2026",
  },
  twitter: {
    card: "summary_large_image",
    title: "SIAME 2026",
    description: "Plataforma integral de gestión documental institucional",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <Providers>
          {children}
          <ToasterProvider />
        </Providers>
      </body>
    </html>
  );
}
