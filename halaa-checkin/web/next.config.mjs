import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  async rewrites() {
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
