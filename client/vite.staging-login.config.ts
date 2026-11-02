import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/staging-login/',
  publicDir: false,
  esbuild: {
    drop: mode === 'development' ? [] : ['console', 'debugger'],
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    outDir: 'dist/staging-login',
    rollupOptions: {
      input: resolve(__dirname, 'staging-login.html'),
      output: {
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
}));
