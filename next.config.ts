import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The MaxMind GeoLite2 .mmdb file (if present) must be traced into the
  // serverless bundle so the ingestion route can read it at runtime on Vercel.
  outputFileTracingIncludes: {
    "/api/collect": ["./geo/**/*"],
  },
  async headers() {
    return [
      {
        // The tracker is embedded on third-party sites, so it must be cacheable
        // and loadable from any origin.
        source: "/tracker.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
