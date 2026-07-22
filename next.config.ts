import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

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

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // Trailing slash
  trailingSlash: false,

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['@dnd-kit/core'],
  },
};

export default nextConfig;
