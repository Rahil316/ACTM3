/// <reference types="vitest/config" />
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            root: '.',
            include: ['tests/shared/**/*.test.ts', 'tests/ui/store/**/*.test.ts'],
            environment: 'node',
          },
        },
        {
          extends: true,
          test: {
            name: 'components',
            root: '.',
            include: ['tests/ui/components/**/*.test.tsx'],
            environment: 'jsdom',
            globals: true,
            setupFiles: ['./tests/setup.ts'],
          },
        },
      ],
    },
  })
);
