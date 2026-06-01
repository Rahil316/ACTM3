// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

import { COLOR_PLACEHOLDER_RE } from './localBgTranslate';

/**
 * After a first engine pass, resolve any roles with localBgTokenRef /
 * localBgDynamicRef by looking up their hex values in the result.
 * Mutates config.roles[*].localBg / localBgPerColor in place.
 * Returns true if any refs were resolved (caller should re-run the engine).
 *
 * Lives in src/shared/ so both the plugin (index.ts) and the UI
 * (PreviewScreen) can import it without pulling in Figma APIs.
 *
 * Cycle protection: a token produced by a role that itself has a
 * localBgTokenRef is "tainted" — any role pointing to a tainted token
 * gets its ref cleared (falls back to theme.bg) to break A→B→A loops.
 */
export function resolveTokenRefBgs(config: AnyObj, result: AnyObj): boolean {
  const roles: AnyObj[]  = config.roles  || [];
  const themes: string[] = (config.themes || []).map((t: AnyObj) => String(t.name).toLowerCase());

  const taintedRoleNames = new Set<string>(
    roles.filter((r: AnyObj) => r.localBgTokenRef).map((r: AnyObj) => String(r.name).toLowerCase()),
  );

  function slugify(s: string) { return s.toLowerCase().replace(/[\s/]+/g, '-'); }

  // Build all candidate slugs for a token so we can match against user-supplied
  // refs that may use either engine format ("brand-fill-0") or Figma variable
  // name format ("Brand/Primary-fill/button-2").
  function tokenSlugs(token: AnyObj): string[] {
    const candidates = new Set<string>();
    if (token.tokenName) candidates.add(slugify(token.tokenName));
    if (token.tokenRef)  candidates.add(slugify(token.tokenRef));
    // Also try "color/role/variation" → slugified, covering Figma variable name patterns
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
      const themeTokens = result?.tokens?.[theme];
      if (!themeTokens) continue;
      outer: for (const colorTokens of Object.values(themeTokens) as AnyObj[]) {
        for (const roleTokens of Object.values(colorTokens) as AnyObj[]) {
          for (const token of Object.values(roleTokens) as AnyObj[]) {
            if (matches(tokenSlugs(token), refSlug)) {
              if (taintedRoleNames.has(slugify(token.role || ''))) cycle = true;
              resolved[theme] = token.value;
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
    if (resolved) { role.localBg = resolved; anyResolved = true; }
    role.localBgTokenRef = null;
  }

  const colorNames: string[] = (config.colors || []).map((c: AnyObj) => String(c.name));
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
