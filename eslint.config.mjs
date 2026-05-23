import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore generated / legacy / build output
  {
    ignores: [
      'node_modules/',
      'dist/',
      'dist-react/',
      'release/',
      'vanilla_archive/',
      'scratch_tests/',
      '**/*.scratch.*',
      'react-src/lib/clrUtils.js',
      'react-src/lib/clrEngine.js',
      'package.js',
      'watch-release.js',
      'postcss.config.js',
      'tailwind.config.js',
    ],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript + React source
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['react-src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
  })),

  {
    files: ['react-src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
      'react-hooks/exhaustive-deps': 'off',
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'warn',
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
    },
  },
);
