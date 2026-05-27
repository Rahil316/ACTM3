import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const outDir = process.env.VITE_OUT_DIR ? `../../${process.env.VITE_OUT_DIR}` : '../../dist';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: 'src/ui',
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