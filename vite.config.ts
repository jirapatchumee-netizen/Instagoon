import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const feedbackEndpoint = () => ({
  name: 'vn-feedback',
  configureServer(server: any) {
    server.middlewares.use('/__vn/feedback', (req: any, res: any) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      let body = '';
      req.on('data', (c: Buffer) => { body += c; if (body.length > 20000) req.destroy(); });
      req.on('end', () => {
        try {
          const rec = { at: new Date().toISOString(), ...JSON.parse(body) };
          fs.appendFileSync(path.resolve(__dirname, 'games/overtime/art/feedback.jsonl'), JSON.stringify(rec) + '\n');
          res.statusCode = 204; res.end();
        } catch { res.statusCode = 400; res.end(); }
      });
    });
  },
});

export default defineConfig({
  base: './',
  plugins: [react(), feedbackEndpoint()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
