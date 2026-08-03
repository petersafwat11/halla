import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone server output for a minimal Docker runtime image. Trace from the
  // monorepo root so the in-repo workspace package (@halaa/shared) is included.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),

  // Ensure static assets are served from the correct path regardless of locale
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",

  // Transpile the in-repo workspace package so Next bundles it rather than
  // externalizing as a node module. Required for `@halaa/shared` (plain ESM).
  transpilePackages: ["@halaa/shared"],

  // Production deploys copy `shared/` into `frontend/node_modules/@halaa/shared`
  // as a real directory (not a symlink) to keep webpack's realpath() from
  // resolving back to the source tree, where peer deps like `xlsx` aren't
  // installed. Setting symlinks:false makes the local dev tree behave the same
  // way and prevents the resolution from drifting on a workspace symlink.
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },

  // Proxy /api/v2/* to the backend in development (and any env where
  // BACKEND_PROXY_URL is set). This routes all API calls through :3000 so
  // the backend's Set-Cookie headers land on the Next.js origin — solving
  // the cross-port HttpOnly cookie isolation issue in dev.
  async rewrites() {
    const backendUrl = process.env.BACKEND_PROXY_URL;
    if (!backendUrl) return [];
    return [
      {
        source: "/api/v2/:path*",
        destination: `${backendUrl}/api/v2/:path*`,
      },
    ];
  },

  images: {
    // Next 16 requires every explicit <Image quality={...}> value to be
    // allowlisted. Keep the framework default and the landing-card quality.
    qualities: [75, 78],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.builder.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "example.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
