import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel streaming 지원을 위한 설정
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
