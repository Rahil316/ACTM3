import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const isDev = process.env.VITE_DEV === 'true';
const outDir = process.env.VITE_OUT_DIR ? `../../${process.env.VITE_OUT_DIR}` : '../../dist';

export default defineConfig({
  plugins: isDev ? [react()] : [react(), viteSingleFile()],
  root: 'src/ui',
  server: {
    port: 3000,
    open: '/ui.html',
  },
  build: {
    outDir,
    emptyOutDir: false,
    target: 'es2017',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/ui/ui.html',
    },
  },
  test: {
    root: '.',
    include: ['src/ui/**/*.test.ts', 'src/ui/**/*.test.tsx'],
    environment: 'node',
  },
});