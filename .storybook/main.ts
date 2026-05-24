import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';

const config: StorybookConfig = {
  "stories": [
    "../src/ui/stories/**/*.mdx",
    "../src/ui/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp"
  ],
  "framework": "@storybook/react-vite",
  async viteFinal(config) {
    console.log("ORIGINAL VITE ROOT:", config.root);
    config.root = path.resolve('.');
    console.log("NEW VITE ROOT:", config.root);
    return config;
  }
};
export default config;