import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output for the minimal production container image.
  // Traced from the mini-app root so the runner starts `node web/server.js`.
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  async rewrites() {
    // Same-origin `/api/checkin/v1` proxy for development and container
    // rehearsal. NOTE: Next serializes rewrites at BUILD time into
    // routes-manifest.json — the destination below is baked from the
    // BACKEND_PROXY_URL build arg, NOT read per request. Production Caddy
    // owns `/api/checkin/v1/*` routing and never sends it to this server, so
    // the baked value is unreachable there (localhost default fails closed).
    const backendUrl = process.env.BACKEND_PROXY_URL || 'http://127.0.0.1:8100';
    return [
      {
        source: '/api/checkin/v1/:path*',
        destination: `${backendUrl}/api/checkin/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
