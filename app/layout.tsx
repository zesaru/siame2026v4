import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ToasterProvider } from "@/components/providers/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SIAME 2026 - Sistema Inteligente para Misiones diplomáticas",
    template: "%s | SIAME 2026",
  },
  description: "Plataforma integral de gestión documental con inteligencia artificial para el procesamiento automático de Guías de Valija y Hojas de Remisión. Potenciado por Azure AI.",
  keywords: ["SIAME", "gestión documental", "inteligencia artificial", "Azure AI", "valija diplomática", "misiones diplomáticas", "documentos"],
  authors: [{ name: "SIAME Team" }],
  creator: "SIAME 2026",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://siame2026.com",
    title: "SIAME 2026 - Sistema Inteligente para Misiones diplomáticas",
    description: "Plataforma integral de gestión documental con inteligencia artificial",
    siteName: "SIAME 2026",
  },
  twitter: {
    card: "summary_large_image",
    title: "SIAME 2026 - Sistema Inteligente para Misiones diplomáticas",
    description: "Plataforma integral de gestión documental con inteligencia artificial",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <ToasterProvider />
      </body>
    </html>
  );
}
