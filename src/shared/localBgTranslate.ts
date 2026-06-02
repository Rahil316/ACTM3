import type { RoleLocalBg, Color, Theme } from './types';

/** Matches the [color] placeholder in dynamic token refs. */
export const COLOR_PLACEHOLDER_RE = /\[color\]/i;

/** Matches the "[color]/" prefix at the start of a dynamic token ref. */
export const DYNAMIC_REF_PREFIX_RE = /^\[color\]\//i;

/**
 * Translate a UI-state localBg shape into the three engine runtime fields.
 * Pure — no Figma APIs, no side effects.
 */
export function translateLocalBg(
  roleLocalBg: RoleLocalBg | null | undefined,
  colors: ReadonlyArray<Pick<Color, 'name' | 'value'>>,
  themes: ReadonlyArray<Pick<Theme, 'name'>>,
): {
  localBgResolved: Record<string, string> | null;
  localBgTokenRef: string | null;
  localBgDynamicRef: string | null;
} {
  if (!roleLocalBg || roleLocalBg.kind === 'theme') {
    return { localBgResolved: null, localBgTokenRef: null, localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === 'hex') {
    return { localBgResolved: roleLocalBg.value as Record<string, string>, localBgTokenRef: null, localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === 'color') {
    const src = colors.find((c) => c.name === (roleLocalBg.value as string));
    const localBgResolved = src
      ? Object.fromEntries(themes.map((t) => [t.name.toLowerCase(), src.value]))
      : null;
    return { localBgResolved, localBgTokenRef: null, localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === 'token-static') {
    return { localBgResolved: null, localBgTokenRef: String(roleLocalBg.value), localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === 'token-dynamic') {
    return { localBgResolved: null, localBgTokenRef: null, localBgDynamicRef: String(roleLocalBg.value) };
  }

  return { localBgResolved: null, localBgTokenRef: null, localBgDynamicRef: null };
}
