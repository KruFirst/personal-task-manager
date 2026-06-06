import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

if (process.env.NODE_ENV === 'development') {
  await setupDevPlatform();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // If allowedDevOrigins is needed for the mobile connection
  experimental: {
    serverActions: {
      allowedOrigins: ['192.168.0.13:3000', 'localhost:3000'],
    },
  },
};

export default nextConfig;
