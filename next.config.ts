import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // an imported chapter is sent to the server as one action call
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // profiles live at /@handle; the files are under /u/[handle]
  async rewrites() {
    return [
      { source: "/@:handle", destination: "/u/:handle" },
      { source: "/@:handle/:tab(followers|following)", destination: "/u/:handle/:tab" },
    ];
  },
};

export default nextConfig;
