import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'index.source.html'),
      output: { manualChunks: { three: ['three'] } },
    },
  },
  server: { host: '127.0.0.1', port: 5191, strictPort: true },
  preview: { host: '127.0.0.1', port: 5191, strictPort: true },
});
