import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs"],

  // Enable React strict mode for better development
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Compression
  compress: true,

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Disable x-powered-by header
  poweredByHeader: false,

  // Trailing slash
  trailingSlash: false,

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['@dnd-kit/core'],
  },
};

export default nextConfig;
