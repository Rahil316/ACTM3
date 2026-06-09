import js from "@eslint/js";
import tseslint from "typescript-eslint";
import figmaPlugin from "@figma/eslint-plugin-figma-plugins";

export default tseslint.config(
  // Ignore generated / legacy / build output / storybook
  {
    ignores: ["node_modules/", "dist/", "dist-release/", "postcss.config.js", "tailwind.config.js", "vite.config.ts", "vitest.config.ts", "vitest.shims.d.ts", ".storybook/", "**/*.stories.ts", "**/*.stories.tsx"],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript + React source
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/ui/**/*.{ts,tsx}", "src/figma/**/*.ts", "src/shared/**/*.ts", "scripts/**/*.ts"],
  })),

  // Language options and parser settings for type information
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./src/figma/tsconfig.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Node script files globals configuration
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
  },

  // Figma Plugin sandbox code configuration
  {
    files: ["src/figma/**/*.ts"],
    languageOptions: {
      globals: {
        figma: "readonly",
        __html__: "readonly",
        console: "readonly",
      },
    },
    plugins: {
      "@figma/figma-plugins": figmaPlugin,
    },
    rules: {
      ...figmaPlugin.configs.recommended.rules,
    },
  },

  // Ban direct shared/ imports from UI — use ../types/state or ../types/messages instead
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    ignores: ["src/ui/types/**", "src/ui/utils/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/shared/**"],
              message: "Import from ../types/state or ../types/messages instead of shared/ directly.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["src/ui/**/*.{ts,tsx}", "src/figma/**/*.ts", "src/shared/**/*.ts", "scripts/**/*.ts"],
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
);
