import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

const isDev     = process.env.VITE_DEV === 'true';
const isRelease = process.env.VITE_OUT_DIR === 'dist-release';
const outDir    = process.env.VITE_OUT_DIR ? `../../${process.env.VITE_OUT_DIR}` : '../../dist';

const renameIndexToUi = {
  name: 'rename-index-to-ui',
  enforce: 'post' as const,
  generateBundle(_: unknown, bundle: Record<string, { fileName: string; type: string }>) {
    const entry = bundle['index.html'];
    if (entry) {
      entry.fileName = 'ui.html';
    }
  },
};

export default defineConfig({
  plugins: isDev ? [react()] : [react(), viteSingleFile(), renameIndexToUi],
  root: 'src/ui',
  cacheDir: '../../node_modules/.vite',
  // Inject __RELEASE__ so tree-shaking removes dev-only code in release builds
  define: {
    __RELEASE__: isRelease,
  },
  server: {
    port: 3000,
    open: '/',
  },
  build: {
    outDir,
    emptyOutDir: false,
    target: 'es2017',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/ui/index.html',
      // Drop all console.log calls (not warn/error) in release
      ...(isRelease && {
        plugins: [{
          name: 'drop-console-log',
          renderChunk(code: string) {
            return code.replace(/console\.log\s*\([^)]*\)\s*;?/g, '');
          },
        }],
      }),
    },
  },
});