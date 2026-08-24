import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/help",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
