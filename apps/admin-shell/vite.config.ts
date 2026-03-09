import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@config': path.resolve(__dirname, '../../packages/config/src'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@auth-center': path.resolve(__dirname, '../auth-center-app/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/admin-api': {
        target: 'http://127.0.0.1:3080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
