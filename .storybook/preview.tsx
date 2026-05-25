import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import '../src/ui/index.css';

// Apply the dark theme by default so tokens resolve correctly.
// Stories can override via the `theme` parameter.
const ThemeDecorator = (Story: React.ComponentType, context: { parameters: { theme?: 'dark' | 'light' } }) => {
  const theme = context.parameters.theme ?? 'dark';
  useEffect(() => {
    document.body.setAttribute('data-ui-theme', theme);
    return () => document.body.removeAttribute('data-ui-theme');
  }, [theme]);
  return (
    <div style={{ background: theme === 'light' ? 'var(--bg-app)' : 'var(--bg-app)', minHeight: '100vh', padding: '24px' }}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [ThemeDecorator],

  parameters: {
    backgrounds: { disable: true }, // we handle bg via tokens
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date:  /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
};

export default preview;
