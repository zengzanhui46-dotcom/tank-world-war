import { defineConfig } from 'vite';

export default defineConfig({
  base: '/tank-world-war/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 8080,
    open: true,
  },
});
