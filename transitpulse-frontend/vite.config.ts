import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: '0.0.0.0',
    open: false,
    strictPort: true,
    cors: true,
    proxy: {
      // Proxy all API requests to the backend
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        secure: false
        // No rewrite needed, keeps /api/v1/... intact
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
