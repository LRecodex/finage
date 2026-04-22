import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['prisma', '@prisma/client', '@prisma/adapter-mariadb'],
};

export default nextConfig;
