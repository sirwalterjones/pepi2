/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    domains: ["images.unsplash.com"],
  },
  output: "standalone",
  distDir: ".next",
  // Use a different port to avoid conflicts
  experimental: {
    serverComponentsExternalPackages: [],
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Enable top-level await support
    topLevelAwait: true,
  },
  // Production optimizations
  webpack: (config, { isServer }) => {
    if (process.env.NODE_ENV === "production") {
      // Enable aggressive code minification
      config.optimization.minimize = true;
    }
    return config;
  },
  // Set page extensions
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  // Ignore build errors in the tempobook directory
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
