import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vlgysrlqjngldfsugtem.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'www.nzherald.co.nz',
        pathname: '/resizer/**',
      },
    ],
  },
};

export default nextConfig;
