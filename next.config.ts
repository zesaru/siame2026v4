import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output mode para despliegue en IIS con iisnode
  output: 'standalone',

  // Deshabilitar optimización de imágenes (IIS maneja esto)
  images: {
    unoptimized: true,
  },

  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },

};

export default nextConfig;