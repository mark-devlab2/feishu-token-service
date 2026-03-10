import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            'import',
            {
              libraryName: '@arco-design/web-react',
              libraryDirectory: 'es',
              camel2DashComponentName: false,
              style: 'css',
            },
            '@arco-design/web-react',
          ],
        ],
      },
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    alias: {
      '@config': path.resolve(__dirname, '../../packages/config/src'),
      '@ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@auth-center': path.resolve(__dirname, '../auth-center-app/src'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('/react-router/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/history/') ||
            id.includes('/@remix-run/')
          ) {
            return 'react-vendor';
          }

          if (id.includes('@arco-design/web-react')) {
            return 'arco-vendor';
          }

          if (id.includes('/axios/')) {
            return 'network-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
});
