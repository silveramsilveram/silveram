import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// The admin is a separate frontend. In development the Vite server proxies /api to the existing
// Express API, so the browser sees one origin and the HTTP-only session cookie just works.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    proxy: { '/api': { target: process.env.ADMIN_DEV_API_TARGET || 'http://localhost:4000', changeOrigin: false } },
  },
  build: {
    // Safari 15+/iOS 15+, Chrome/Edge 100+, Firefox 100+, Samsung Internet 18+: every current phone and browser.
    target: ['es2020', 'chrome100', 'safari15', 'firefox100', 'edge100'],
    sourcemap: false,
  },
  test: { environment: 'node', globals: false, include: ['src/**/*.test.{ts,tsx}'] },
});
