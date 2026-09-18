import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bill_recognition/',

  server: {
    host: '127.0.0.1',
    port: 5173,
    open: false
  },

  build: {
    outDir: 'dist',
    minify: 'esbuild'
  }
});
