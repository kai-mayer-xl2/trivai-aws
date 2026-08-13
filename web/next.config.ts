import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
      allowedOrigins: ["*.cloudfront.net"],
    },
  },
};

export default nextConfig;
