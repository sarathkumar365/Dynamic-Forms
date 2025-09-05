/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['*'] }
  },
  // Mitigate recurring webpack cache corruption on some filesystems (e.g., Downloads, network/VM mounts)
  // by disabling persistent filesystem cache in development. This prevents stale/missing chunk files
  // like "./948.js" in .next/server and avoids ENOENT rename errors in .next/cache/webpack/*.
  webpack(config, { dev }) {
    if (dev) {
      config.cache = false;
    }
    return config;
  }
};
export default nextConfig;
