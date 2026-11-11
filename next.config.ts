import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  // The dev server only serves its bootstrap and HMR socket to localhost.
  // 127.0.0.1 and a Tailscale address are different hosts, so the server
  // HTML stays on "Loading packs…" and React never attaches.
  allowedDevOrigins: ["127.0.0.1", "100.*.*.*"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
