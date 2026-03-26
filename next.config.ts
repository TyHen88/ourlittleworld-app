import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["react-markdown", "remark-gfm"],
  serverExternalPackages: ["ably"],
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
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
