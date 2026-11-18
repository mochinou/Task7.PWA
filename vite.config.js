import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { serviceWorkerPlugin } from './pwa/vite-plugin-service-worker.js';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // GitHub Pages serves the app from /<repo-name>/, so the base path is injected
  // by the deploy workflow (BASE_PATH=/Task6.Auth/). Locally it defaults to "/".
  const rawBase = process.env.BASE_PATH || '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  const apiBaseUrl = (env.VITE_API_BASE_URL || 'https://dummyjson.com').replace(/\/$/, '');

  return {
    base,
    plugins: [
      react(),
      serviceWorkerPlugin({
        swSrc: 'pwa/service-worker.js',
        apiBaseUrl,
      }),
    ],
    server: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
