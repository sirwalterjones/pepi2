/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    domains: ["images.unsplash.com"],
  },
  output: "standalone",
  distDir: ".next",
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
};

module.exports = nextConfig;
