import js from "@eslint/js";
import tseslint from "typescript-eslint";

// fmt-lang/ is its own package (own tsconfig.json, own node_modules) —
// excluded from the root eslint.config.mjs for the same reason cli/ is:
// the root config's type-aware parserOptions.project only points at the
// main plugin's tsconfigs, which don't include this package. This config
// mirrors the root's TS-recommended setup, scoped to fmt-lang's own files
// and its own tsconfig.
export default tseslint.config(
  {
    ignores: ["node_modules/", "dist/"],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts", "test/**/*.ts"],
  })),

  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-expect-error": "allow-with-description" }],
      "no-debugger": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "warn",
      eqeqeq: ["warn", "always", { null: "ignore" }],
    },
  },

  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        __dirname: "readonly",
        require: "readonly",
        console: "readonly",
        module: "readonly",
        exports: "readonly",
      },
    },
  }
);
