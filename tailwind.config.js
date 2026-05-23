/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./react-src/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Background scale
        'bg-app':    'var(--bg-app)',
        'bg-panel':  'var(--bg-panel)',
        'bg-card':   'var(--bg-card)',
        'bg-input':  'var(--bg-input)',
        'bg-hover':  'var(--bg-hover)',
        'bg-active': 'var(--bg-active)',
        // Borders
        'border-base':  'var(--border)',
        'border-input': 'var(--border-input)',
        'border-focus': 'var(--border-focus)',
        // Text
        'text-primary': 'var(--text-primary)',
        'text-muted':   'var(--text-muted)',
        'text-dim':     'var(--text-dim)',
        // Brand
        accent:         'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        danger:         'var(--danger)',
      },
      borderColor: {
        DEFAULT:      'var(--border)',
        base:         'var(--border)',
        input:        'var(--border-input)',
        focus:        'var(--border-focus)',
      },
      gridTemplateColumns: {
        swatches: 'repeat(auto-fill, minmax(60px, 1fr))',
      },
    },
  },
  plugins: [],
};
