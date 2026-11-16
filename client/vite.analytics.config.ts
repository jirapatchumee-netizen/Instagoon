import { resolve } from 'path';
import { copyFileSync, existsSync, writeFileSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'analytics-postbuild',
      closeBundle() {
        const outDir = resolve(__dirname, 'dist-analytics');
        const src = resolve(outDir, 'analytics.html');
        const dest = resolve(outDir, 'index.html');
        if (existsSync(src)) {
          copyFileSync(src, dest);
        }
        // Force Disallow all indexing on analytics plane
        writeFileSync(resolve(outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
        writeFileSync(resolve(outDir, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n', 'utf8');
      }
    }
  ],
  publicDir: false,
  esbuild: {
    drop: mode === 'development' ? [] : ['console', 'debugger'],
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    outDir: 'dist-analytics',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'analytics.html'),
      output: {
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
}));
