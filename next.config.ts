import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["react-markdown", "remark-gfm"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.nzherald.co.nz",
        pathname: "/resizer/**",
      },
    ],
  },
};

export default nextConfig;
