/** @type {import('next').NextConfig} */
const nextConfig = {
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
