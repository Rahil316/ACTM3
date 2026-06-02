import { COLOR_PLACEHOLDER_RE } from './localBgTranslate';
import type { Role } from './types';
import type { EngineInput } from './clrEngine';
import type { EngineResult } from '../plugin/exportEng/types';

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

  const taintedRoleNames = new Set<string>(
    roles.filter((r) => r.localBgTokenRef).map((r) => String(r.name).toLowerCase()),
  );

  function slugify(s: string) { return s.toLowerCase().replace(/[\s/]+/g, '-'); }

  function tokenSlugs(token: Record<string, unknown>): string[] {
    const candidates = new Set<string>();
    if (token.tokenName) candidates.add(slugify(String(token.tokenName)));
    if (token.tokenRef)  candidates.add(slugify(String(token.tokenRef)));
    if (token.color && token.role && token.variation != null) {
      candidates.add(slugify(`${token.color}-${token.role}-${token.variation}`));
      candidates.add(slugify(`${token.color}/${token.role}/${token.variation}`));
    }
    return Array.from(candidates);
  }

  function matches(tokenSlugsArr: string[], refSlug: string): boolean {
    return tokenSlugsArr.some(
      (s) => s === refSlug || s.endsWith('-' + refSlug) || refSlug.endsWith('-' + s),
    );
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
              if (taintedRoleNames.has(slugify(String(t.role || '')))) cycle = true;
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
    if (resolved) { role.localBgResolved = resolved; anyResolved = true; }
    role.localBgTokenRef = null;
  }

  const colorNames: string[] = (config.colors || []).map((c) => String(c.name));
  for (const role of roles) {
    if (!role.localBgDynamicRef) continue;
    const template: string = role.localBgDynamicRef;
    const perColor: Record<string, Record<string, string>> = {};
    for (const colorName of colorNames) {
      const ref = template.replace(new RegExp(COLOR_PLACEHOLDER_RE.source, 'gi'), colorName);
      const resolved = resolveRef(ref);
      if (resolved) perColor[colorName] = resolved;
    }
    if (Object.keys(perColor).length > 0) { role.localBgPerColor = perColor; anyResolved = true; }
    role.localBgDynamicRef = null;
  }

  return anyResolved;
}
