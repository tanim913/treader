import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // an imported chapter is sent to the server as one action call
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
