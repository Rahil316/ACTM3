// resolver
import type { Role } from "./types";
import type { EngineInput } from "./clrEngine";
import type { EngineResult } from "./exportEng/types";

/**
 * After a first engine pass, resolve any roles with localBgTokenRef /
 * localBgDynamicRef by looking up their hex values in the result.
 * Mutates config.roles[*].localBgResolved / localBgPerColor in place.
 * Returns true if any refs were resolved (caller should re-run the engine).
 *
 * Cycle protection: a token produced by a role that itself has a
 * localBgTokenRef is "tainted" — any role pointing to a tainted token
 * gets its ref cleared (falls back to theme.bg) to break A→B→A loops.
 */
export function resolveTokenRefBgs(config: EngineInput, result: EngineResult): boolean {
  const roles: Role[] = config.roles || [];
  const themes: string[] = (config.themes || []).map((t) => String(t.name).toLowerCase());

  const taintedRoleNames = new Set<string>(roles.filter((r) => r.localBgTokenRef).map((r) => String(r.name).toLowerCase()));

  function slugify(s: string) {
    return s.toLowerCase().replace(/[\s/]+/g, "-");
  }

  function tokenSlugs(token: Record<string, unknown>): string[] {
    const candidates = new Set<string>();
    if (token.tokenName) candidates.add(slugify(String(token.tokenName)));
    if (token.tokenRef) candidates.add(slugify(String(token.tokenRef)));
    if (token.color && token.role && token.variation != null) {
      candidates.add(slugify(`${token.color}-${token.role}-${token.variation}`));
      candidates.add(slugify(`${token.color}/${token.role}/${token.variation}`));
    }
    return Array.from(candidates);
  }

  function matches(tokenSlugsArr: string[], refSlug: string): boolean {
    return tokenSlugsArr.some((s) => s === refSlug || s.endsWith("-" + refSlug) || refSlug.endsWith("-" + s));
  }

  function resolveRef(ref: string): Record<string, string> | null {
    const refSlug = slugify(ref);
    const resolved: Record<string, string> = {};
    let cycle = false;
    for (const theme of themes) {
      const themeTokens = (result?.tokens as Record<string, unknown>)?.[theme] as Record<string, unknown> | undefined;
      if (!themeTokens) continue;
      outer: for (const colorTokens of Object.values(themeTokens)) {
        for (const roleTokens of Object.values(colorTokens as Record<string, unknown>)) {
          for (const token of Object.values(roleTokens as Record<string, unknown>)) {
            const t = token as Record<string, unknown>;
            if (matches(tokenSlugs(t), refSlug)) {
              if (taintedRoleNames.has(slugify(String(t.role || "")))) cycle = true;
              resolved[theme] = String(t.value);
              break outer;
            }
          }
        }
      }
    }
    if (cycle) return null;
    return Object.keys(resolved).length > 0 ? resolved : null;
  }

  let anyResolved = false;

  for (const role of roles) {
    if (!role.localBgTokenRef) continue;
    const resolved = resolveRef(role.localBgTokenRef);
    if (resolved) {
      role.localBgResolved = resolved;
      anyResolved = true;
    }
    role.localBgTokenRef = null;
  }

  const colorNames: string[] = (config.colors || []).map((c) => String(c.name));
  for (const role of roles) {
    if (!role.localBgDynamicRef) continue;
    const template: string = role.localBgDynamicRef;
    const perColor: Record<string, Record<string, string>> = {};
    for (const colorName of colorNames) {
      const ref = template.replace(new RegExp(COLOR_PLACEHOLDER_RE.source, "gi"), colorName);
      const resolved = resolveRef(ref);
      if (resolved) perColor[colorName] = resolved;
    }
    if (Object.keys(perColor).length > 0) {
      role.localBgPerColor = perColor;
      anyResolved = true;
    }
    role.localBgDynamicRef = null;
  }

  return anyResolved;
}

export function validHex(hex: unknown): hex is string {
  if (typeof hex !== "string") return false;
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

export function normalizeHex(hex: string): string | null {
  if (!validHex(hex)) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return "#" + h.toUpperCase();
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const nhex = normalizeHex(hex);
  if (!nhex) return null;
  const bigint = parseInt(nhex.replace(/^#/, ""), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] | null {
  if ([r, g, b].some((v) => typeof v !== "number" || v < 0 || v > 255)) return null;
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export function hexToHsl(hex: string): [number, number, number] | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb[0], rgb[1], rgb[2]) : null;
}

export function hexToHue(hex: string): number | null {
  const hsl = hexToHsl(hex);
  return hsl ? hsl[0] : null;
}

export function hexToSat(hex: string): number | null {
  const hsl = hexToHsl(hex);
  return hsl ? hsl[1] : null;
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] | null {
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function rgbToHex(r: number, g: number, b: number): string | null {
  if ([r, g, b].some((v) => v < 0 || v > 255)) return null;
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

export function hslToHex(h: number, s: number, l: number): string | null {
  const rgb = hslToRgb(h, s, l);
  return rgb ? rgbToHex(rgb[0], rgb[1], rgb[2]) : null;
}

export function srgbLinearize(v: number): number {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function srgbDelinearize(v: number): number {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

export function relLum(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(srgbLinearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hex1: string, hex2: string): number | null {
  const n1 = normalizeHex(hex1),
    n2 = normalizeHex(hex2);
  if (!n1 || !n2) return null;
  const l1 = relLum(n1),
    l2 = relLum(n2);
  if (l1 === null || l2 === null) return null;
  return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

export function shortestHueDiff(current: number, target: number): number {
  return ((((target - current + 180) % 360) + 360) % 360) - 180;
}

export type ContrastRating = "Fail" | "AA Large Text" | "AA" | "AAA";

export function contrastRating(hex1: string, hex2: string): ContrastRating | null {
  const ratio = contrastRatio(hex1, hex2);
  if (ratio === null) return null;
  if (ratio < 3) return "Fail";
  if (ratio < 4.5) return "AA Large Text";
  if (ratio < 7) return "AA";
  return "AAA";
}

export function seriesMaker(x: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= x; i++) out.push(i);
  return out;
}

export function sanitizeHex(val: string): string {
  return (val || "")
    .replace(/[^0-9A-Fa-f]/g, "")
    .toUpperCase()
    .substring(0, 6);
}

import type { RoleLocalBg, Color, Theme } from "./types";

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
  colors: ReadonlyArray<Pick<Color, "name" | "value">>,
  themes: ReadonlyArray<Pick<Theme, "name">>,
): {
  localBgResolved: Record<string, string> | null;
  localBgTokenRef: string | null;
  localBgDynamicRef: string | null;
} {
  if (!roleLocalBg || roleLocalBg.kind === "theme") {
    return { localBgResolved: null, localBgTokenRef: null, localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === "hex") {
    return { localBgResolved: roleLocalBg.value as Record<string, string>, localBgTokenRef: null, localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === "color") {
    const src = colors.find((c) => c.name === (roleLocalBg.value as string));
    const localBgResolved = src ? Object.fromEntries(themes.map((t) => [t.name.toLowerCase(), src.value])) : null;
    return { localBgResolved, localBgTokenRef: null, localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === "token-static") {
    return { localBgResolved: null, localBgTokenRef: String(roleLocalBg.value), localBgDynamicRef: null };
  }

  if (roleLocalBg.kind === "token-dynamic") {
    return { localBgResolved: null, localBgTokenRef: null, localBgDynamicRef: String(roleLocalBg.value) };
  }

  return { localBgResolved: null, localBgTokenRef: null, localBgDynamicRef: null };
}
