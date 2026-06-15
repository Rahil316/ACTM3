// @ts-check

// Theme 2.0 — generates entries for all 5 colors × 7 roles × their variations.
// Each entry maps a Tailwind class name to its CSS custom property.
// e.g. 'n-sf-default' → 'var(--n-sf-default)', 'b-fi-btn-hover' → 'var(--b-fi-btn-hover)'
function theme2Colors() {
  const colors = ['n', 'b', 'd', 's', 'w'];
  const tokens = [
    'bg-app', 'bg-panel', 'bg-overly',
    'sf-sunken', 'sf-default', 'sf-input', 'sf-raised', 'sf-overlay', 'sf-hover', 'sf-active',
    'br-hairline', 'br-subtle', 'br-default', 'br-strong',
    'tx-primary', 'tx-secondary', 'tx-muted', 'tx-dim', 'tx-disabled',
    'fi-subtle', 'fi-default', 'fi-strong', 'fi-stronger', 'fi-strongest',
    'fi-btn-disabled', 'fi-btn-subtle', 'fi-btn-default', 'fi-btn-hover', 'fi-btn-pressed',
    'tx-btn-disabled', 'tx-btn-subtle', 'tx-btn-default', 'tx-btn-hover', 'tx-btn-pressed',
  ];
  /** @type {Record<string, string>} */
  const entries = {};
  for (const c of colors) {
    for (const t of tokens) {
      const key = `${c}-${t}`;
      entries[key] = `var(--${key})`;
    }
  }
  return entries;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/ui/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...theme2Colors(),
      },

      borderColor: {
        DEFAULT: 'var(--n-br-default)',
        subtle:  'var(--n-br-subtle)',
        base:    'var(--n-br-default)',
        strong:  'var(--n-br-strong)',
        input:   'var(--n-br-default)',
        focus:   'var(--b-br-strong)',
        accent:  'var(--b-br-default)',
        danger:  'var(--d-br-default)',
        success: 'var(--s-br-default)',
        warning: 'var(--w-br-default)',
      },

      ringColor: {
        DEFAULT: 'var(--b-br-strong)',
        accent:  'var(--b-fi-subtle)',
        danger:  'var(--d-fi-subtle)',
        success: 'var(--s-fi-subtle)',
        base:    'var(--n-br-default)',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },

      gridTemplateColumns: {
        swatches: 'repeat(auto-fill, minmax(60px, 1fr))',
      },
    },
  },
  plugins: [],
};
