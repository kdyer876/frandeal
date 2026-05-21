/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000', 'frandeal.com'] },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.bizbuysell.com' },
      { protocol: 'https', hostname: 'cdn.franchisegator.com' },
    ],
  },
};

module.exports = nextConfig;
