import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["ag-grid-react", "ag-grid-community"],
};

export default nextConfig;
