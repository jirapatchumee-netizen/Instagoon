import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendPort = process.env.VITE_BACKEND_PORT || '8799';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'player') },
  },
  server: {
    proxy: {
      '/api': `http://127.0.0.1:${backendPort}`,
      '/auth': `http://127.0.0.1:${backendPort}`,
    },
  },
  // Anti-REA Hardening: Strip console & debugger in production/staging builds
  esbuild: {
    drop: mode === 'development' ? [] : ['console', 'debugger'],
  },
  build: {
    // Strictly prevent source map leakage
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Obfuscate chunk file names into clean hashed chunks
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
}));
