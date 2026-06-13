// ============================================================================
// CSS VARIABLE GENERATOR
// Converts ThemeTokens objects into CSS custom property declarations.
//
// Naming convention preserved for backward compat with all existing components:
//   surface.*      →  --bg-*
//   border.*       →  --border-*
//   text.*         →  --text-*        (onAccent → on-accent)
//   accent.*       →  --accent-*      (DEFAULT → --accent)
//   status.*       →  flat mapped (success, success-subtle, warning, …)
// ============================================================================

import type { ThemeTokens } from "./tokens";

type CssVarMap = Record<string, string>;

function surfaceVars(t: ThemeTokens["surface"]): CssVarMap {
  return {
    "--bg-app": t.app,
    "--bg-panel": t.panel,
    "--bg-card": t.card,
    "--bg-cardDim": t.cardDim,
    "--bg-input": t.input,
    "--bg-hover": t.hover,
    "--bg-active": t.active,
    "--bg-overlay": t.overlay,
    "--bg-scrim": t.scrim,
  };
}

function borderVars(t: ThemeTokens["border"]): CssVarMap {
  return {
    "--border-subtle": t.subtle,
    "--border-base": t.base,
    "--border-strong": t.strong,
    "--border-input": t.input,
    "--border-focus": t.focus,
  };
}

function textVars(t: ThemeTokens["text"]): CssVarMap {
  return {
    "--text-primary": t.primary,
    "--text-secondary": t.secondary,
    "--text-muted": t.muted,
    "--text-dim": t.dim,
    "--text-disabled": t.disabled,
    "--text-inverse": t.inverse,
    "--text-on-accent": t.onAccent,
  };
}

function accentVars(t: ThemeTokens["accent"]): CssVarMap {
  return {
    "--accent": t.DEFAULT,
    "--accent-hover": t.hover,
    "--accent-subtle": t.subtle,
    "--accent-glow": t.glow,
  };
}

function statusVars(t: ThemeTokens["status"]): CssVarMap {
  return {
    "--success": t.success,
    "--success-subtle": t.successSubtle,
    "--warning": t.warning,
    "--warning-subtle": t.warningSubtle,
    "--danger": t.danger,
    "--danger-hover": t.dangerHover,
    "--danger-subtle": t.dangerSubtle,
  };
}

/** Returns a flat Record of all CSS custom properties for a theme. */
export function toCssVars(theme: ThemeTokens): CssVarMap {
  return {
    ...surfaceVars(theme.surface),
    ...borderVars(theme.border),
    ...textVars(theme.text),
    ...accentVars(theme.accent),
    ...statusVars(theme.status),
  };
}

/** Serialises a CssVarMap to a CSS declaration block body (no selector wrapper). */
export function serializeVars(vars: CssVarMap): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
}

/** Full CSS block for a given selector + theme. */
export function themeBlock(selector: string, theme: ThemeTokens): string {
  return `${selector} {\n${serializeVars(toCssVars(theme))}\n}`;
}
