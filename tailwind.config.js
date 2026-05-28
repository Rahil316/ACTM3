// @ts-check

// Tokens are the single source of truth — no values live here.
// Adding a token: edit src/ui/theme/tokens.ts only.
const { dark } = require('./src/ui/theme/tokens');

/** Maps a token group's keys to Tailwind color entries pointing at CSS vars.
 *  e.g. surface.card → { 'bg-card': 'var(--bg-card)' }
 */
function surfaceColors(t = dark.surface) {
  return Object.fromEntries(
    Object.keys(t).map(k => [`bg-${k}`, `var(--bg-${k})`])
  );
}

function borderColorEntries(t = dark.border) {
  return Object.fromEntries(
    Object.keys(t).map(k => [`border-${k}`, `var(--border-${k})`])
  );
}

function textColors(t = dark.text) {
  return Object.fromEntries(
    Object.keys(t).map(k => {
      const varName = k === 'onAccent' ? 'on-accent' : k;
      return [`text-${varName}`, `var(--text-${varName})`];
    })
  );
}

function accentColors(t = dark.accent) {
  return {
    'accent':        'var(--accent)',
    'accent-hover':  'var(--accent-hover)',
    'accent-subtle': 'var(--accent-subtle)',
    'accent-glow':   'var(--accent-glow)',
  };
}

function statusColors() {
  return {
    'success':        'var(--success)',
    'success-subtle': 'var(--success-subtle)',
    'warning':        'var(--warning)',
    'warning-subtle': 'var(--warning-subtle)',
    'danger':         'var(--danger)',
    'danger-hover':   'var(--danger-hover)',
    'danger-subtle':  'var(--danger-subtle)',
  };
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/ui/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...surfaceColors(),
        ...borderColorEntries(),
        ...textColors(),
        ...accentColors(),
        ...statusColors(),
      },

      borderColor: {
        DEFAULT: 'var(--border-base)',
        subtle:  'var(--border-subtle)',
        base:    'var(--border-base)',
        strong:  'var(--border-strong)',
        input:   'var(--border-input)',
        focus:   'var(--border-focus)',
        accent:  'var(--accent)',
        danger:  'var(--danger)',
        success: 'var(--success)',
        warning: 'var(--warning)',
      },

      ringColor: {
        DEFAULT: 'var(--border-focus)',
        accent:  'var(--accent-glow)',
        danger:  'var(--danger-subtle)',
        success: 'var(--success-subtle)',
        base:    'var(--border-base)',
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
