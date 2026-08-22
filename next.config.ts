import type { NextConfig } from "next";

const isDesktopBuild = process.env.OPSLY_DESKTOP === "1";

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID: isDesktopBuild
      ? ""
      : (process.env.VERCEL_DEPLOYMENT_ID ?? ""),
    NEXT_PUBLIC_OPSLY_DESKTOP: isDesktopBuild ? "1" : "",
  },
  ...(isDesktopBuild
    ? {
        output: "export",
        trailingSlash: true,
        images: {
          unoptimized: true,
        },
      }
    : {
        async redirects() {
          return [
            {
              source: "/app",
              destination: "/",
              permanent: true,
            },
          ];
        },
        async headers() {
          return [
            {
              source: "/deployment-id.txt",
              headers: [
                { key: "Cache-Control", value: "no-store, max-age=0" },
              ],
            },
            {
              source: "/sql-wasm-browser.wasm",
              headers: [
                { key: "Content-Type", value: "application/wasm" },
              ],
            },
            {
              source: "/sql-wasm.wasm",
              headers: [
                { key: "Content-Type", value: "application/wasm" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
