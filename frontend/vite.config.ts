import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL?.trim();
  const isLocalApiUrl = Boolean(apiUrl && /(^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$)/i.test(apiUrl));

  if (command === 'build' && !apiUrl) {
    throw new Error('VITE_API_URL must be set before running a production build.');
  }

  if (command === 'build' && isLocalApiUrl) {
    throw new Error('VITE_API_URL must point to a non-localhost origin for production builds.');
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material'],
            motion: ['motion/react'],
            charts: ['recharts'],
            json: ['react-json-tree'],
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['./test/**/*.{test,spec}.{ts,tsx}'],
      setupFiles: './test/setupTests.ts',
    },
  };
});
