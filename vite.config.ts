import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: 'react-src',
  build: {
    outDir: '../dist-react',
    emptyOutDir: true,
    target: 'es2017',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'react-src/ui.html',
    },
  },
  test: {
    root: '.',
    include: ['react-src/**/*.test.ts', 'react-src/**/*.test.tsx'],
    environment: 'node',
  },
});