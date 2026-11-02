import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/staging-login/',
  publicDir: false,
  build: {
    outDir: 'dist/staging-login',
    rollupOptions: { input: resolve(__dirname, 'staging-login.html') },
  },
});
