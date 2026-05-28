// ============================================================================
// TOKEN WAND — DESIGN TOKENS
// Single source of truth for all color values.
//
// tailwind.config.js  →  imports ThemeTokens + dark/light directly
// cssVars.ts          →  converts these objects into CSS custom properties
// index.css           →  injects the generated CSS vars via @layer base
//
// To add a token:
//   1. Add it to ThemeTokens interface
//   2. Add the value to `dark` and `light`
//   That's it — Tailwind and CSS vars update automatically.
// ============================================================================

export interface SurfaceTokens {
  app:     string;
  panel:   string;
  card:    string;
  input:   string;
  hover:   string;
  active:  string;
  overlay: string;
  scrim:   string;
}

export interface BorderTokens {
  subtle: string;
  base:   string;
  strong: string;
  input:  string;
  focus:  string;
}

export interface TextTokens {
  primary:   string;
  secondary: string;
  muted:     string;
  dim:       string;
  disabled:  string;
  inverse:   string;
  onAccent:  string;
}

export interface AccentTokens {
  DEFAULT: string;
  hover:   string;
  subtle:  string;
  glow:    string;
}

export interface StatusTokens {
  success:        string;
  successSubtle:  string;
  warning:        string;
  warningSubtle:  string;
  danger:         string;
  dangerHover:    string;
  dangerSubtle:   string;
}

export interface ThemeTokens {
  surface: SurfaceTokens;
  border:  BorderTokens;
  text:    TextTokens;
  accent:  AccentTokens;
  status:  StatusTokens;
}

// ── DARK ─────────────────────────────────────────────────────────────────────

export const dark: ThemeTokens = {
  surface: {
    app:     '#0d0d0d',
    panel:   '#1a1a1a',
    card:    '#262626',
    input:   '#333333',
    hover:   '#3d3d3d',
    active:  '#4a4a4a',
    overlay: '#1a1a1aee',
    scrim:   'rgba(0,0,0,0.6)',
  },
  border: {
    subtle: '#2a2a2a',
    base:   '#3a3a3a',
    strong: '#555555',
    input:  '#444444',
    focus:  '#18a0fb',
  },
  text: {
    primary:   '#f0f0f0',
    secondary: '#c8c8c8',
    muted:     '#8a8a8a',
    dim:       '#555555',
    disabled:  '#3d3d3d',
    inverse:   '#0d0d0d',
    onAccent:  '#ffffff',
  },
  accent: {
    DEFAULT: '#18a0fb',
    hover:   '#0d8de8',
    subtle:  'rgba(24,160,251,0.12)',
    glow:    'rgba(24,160,251,0.25)',
  },
  status: {
    success:       '#22c55e',
    successSubtle: 'rgba(34,197,94,0.12)',
    warning:       '#f59e0b',
    warningSubtle: 'rgba(245,158,11,0.12)',
    danger:        '#ef4444',
    dangerHover:   '#dc2626',
    dangerSubtle:  'rgba(239,68,68,0.12)',
  },
};

// ── LIGHT ─────────────────────────────────────────────────────────────────────

export const light: ThemeTokens = {
  surface: {
    app:     '#e8ebf0',
    panel:   '#f5f6f8',
    card:    '#ffffff',
    input:   '#ffffff',
    hover:   '#eef0f3',
    active:  '#e2e5ea',
    overlay: '#ffffffee',
    scrim:   'rgba(0,0,0,0.35)',
  },
  border: {
    subtle: '#e2e5ea',
    base:   '#d0d4db',
    strong: '#b0b6c0',
    input:  '#c4c9d2',
    focus:  '#18a0fb',
  },
  text: {
    primary:   '#111827',
    secondary: '#374151',
    muted:     '#6b7280',
    dim:       '#9ca3af',
    disabled:  '#d1d5db',
    inverse:   '#f0f0f0',
    onAccent:  '#ffffff',
  },
  accent: {
    DEFAULT: '#18a0fb',
    hover:   '#0d8de8',
    subtle:  'rgba(24,160,251,0.10)',
    glow:    'rgba(24,160,251,0.20)',
  },
  status: {
    success:       '#16a34a',
    successSubtle: 'rgba(22,163,74,0.10)',
    warning:       '#d97706',
    warningSubtle: 'rgba(217,119,6,0.10)',
    danger:        '#dc2626',
    dangerHover:   '#b91c1c',
    dangerSubtle:  'rgba(220,38,38,0.10)',
  },
};

// ── TYPOGRAPHY (theme-independent) ───────────────────────────────────────────

export const typography = {
  fontSans: ['Inter', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
  fontMono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
} as const;
