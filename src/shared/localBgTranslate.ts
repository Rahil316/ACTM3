/** Matches the [color] placeholder in dynamic token refs. */
export const COLOR_PLACEHOLDER_RE = /\[color\]/i;

/** Matches the "[color]/" prefix at the start of a dynamic token ref. */
export const DYNAMIC_REF_PREFIX_RE = /^\[color\]\//i;

/**
 * Translate a UI-state localBg shape into the three engine fields.
 * Pure — no Figma APIs, no side effects.
 *
 * kind typed as string (not union) so plugin's any-typed appState calls without cast.
 * Structural param types so src/shared/ stays free of src/ui/ imports.
 */
export function translateLocalBg(
  roleLocalBg: { kind: string; value: unknown; dynamic?: boolean } | null | undefined,
  colors: ReadonlyArray<{ name: string; value: string }>,
  themes: ReadonlyArray<{ name: string }>,
): {
  localBg: Record<string, string> | null;
  localBgTokenRef: string | null;
  localBgDynamicRef: string | null;
} {
  if (!roleLocalBg) {
    return { localBg: null, localBgTokenRef: null, localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === 'hex') {
    return { localBg: roleLocalBg.value as Record<string, string>, localBgTokenRef: null, localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === 'color') {
    const src = colors.find((c) => c.name === (roleLocalBg.value as string));
    const localBg = src
      ? Object.fromEntries(themes.map((t) => [t.name.toLowerCase(), src.value]))
      : null;
    return { localBg, localBgTokenRef: null, localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === 'token') {
    const val = String(roleLocalBg.value);
    if (roleLocalBg.dynamic && COLOR_PLACEHOLDER_RE.test(val)) {
      return { localBg: null, localBgTokenRef: null, localBgDynamicRef: val };
    }
    return { localBg: null, localBgTokenRef: val, localBgDynamicRef: null };
  }

  return { localBg: null, localBgTokenRef: null, localBgDynamicRef: null };
}
