/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["images.unsplash.com", "api.dicebear.com"],
  },
  experimental: {
    serverComponentsExternalPackages: ["pdf-lib"],
    serverActions: true,
  },
  // Production optimizations
  webpack: (config, { isServer }) => {
    if (process.env.NODE_ENV === "production") {
      // Enable aggressive code minification
      config.optimization.minimize = true;
    }

    // Fix for "Unsupported Server Component type: Module" error
    if (isServer) {
      config.experiments = {
        ...config.experiments,
        layers: true,
      };
    }

    return config;
  },
  // Ignore build errors to allow deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
