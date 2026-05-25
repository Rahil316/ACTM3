/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/ui/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ──────────────────────────────────────────────────────────
        'bg-app':     'var(--bg-app)',
        'bg-panel':   'var(--bg-panel)',
        'bg-card':    'var(--bg-card)',
        'bg-input':   'var(--bg-input)',
        'bg-hover':   'var(--bg-hover)',
        'bg-active':  'var(--bg-active)',
        'bg-overlay': 'var(--bg-overlay)',
        'bg-scrim':   'var(--bg-scrim)',

        // ── Borders ───────────────────────────────────────────────────────────
        'border-subtle': 'var(--border-subtle)',
        'border-base':   'var(--border-base)',
        'border-strong': 'var(--border-strong)',
        'border-input':  'var(--border-input)',
        'border-focus':  'var(--border-focus)',

        // ── Text ──────────────────────────────────────────────────────────────
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted':     'var(--text-muted)',
        'text-dim':       'var(--text-dim)',
        'text-disabled':  'var(--text-disabled)',
        'text-inverse':   'var(--text-inverse)',
        'text-on-accent': 'var(--text-on-accent)',

        // ── Accent ────────────────────────────────────────────────────────────
        'accent':        'var(--accent)',
        'accent-hover':  'var(--accent-hover)',
        'accent-subtle': 'var(--accent-subtle)',
        'accent-glow':   'var(--accent-glow)',

        // ── Success ───────────────────────────────────────────────────────────
        'success':        'var(--success)',
        'success-subtle': 'var(--success-subtle)',

        // ── Warning ───────────────────────────────────────────────────────────
        'warning':        'var(--warning)',
        'warning-subtle': 'var(--warning-subtle)',

        // ── Danger ────────────────────────────────────────────────────────────
        'danger':        'var(--danger)',
        'danger-hover':  'var(--danger-hover)',
        'danger-subtle': 'var(--danger-subtle)',
      },

      // borderColor makes border-base, border-strong etc. work as
      // border color utilities (separate from bg- collision risk)
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

      // ringColor for focus-visible outlines
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
