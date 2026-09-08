#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Starting Halaa Guest Check-in development servers...');
console.log('API Service -> http://127.0.0.1:8100');
console.log('Web Service -> http://localhost:3100');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const apiProc = spawn(npmCmd, ['--prefix', path.resolve(rootDir, 'api'), 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '8100' },
});

const webProc = spawn(npmCmd, ['--prefix', path.resolve(rootDir, 'web'), 'run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '3100', BACKEND_PROXY_URL: 'http://127.0.0.1:8100' },
});

function cleanup() {
  console.log('\nShutting down development servers...');
  apiProc.kill('SIGINT');
  webProc.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
