import type { EngineResult, ExportConfig } from './types';
import { _slug, _eachSourceColor } from './helpers';
import { resolveScaleSteps, type ResolvedToken } from './resolve';

// Groups a theme's resolved tokens by raw colorName, preserving first-seen
// order — CSS's "/* {colorName} */" comment groups by the original color
// identity regardless of where tokenNameSegments places color in the
// variable name itself (confirmed against the shorthand-everything fixture,
// which reorders segments to role-first but still groups comments by color).
function _groupByColor(tokens: ResolvedToken[], theme: string): { colorName: string; tokens: ResolvedToken[] }[] {
  const order: string[] = [];
  const byColor = new Map<string, ResolvedToken[]>();
  for (const t of tokens) {
    if (t.theme !== theme) continue;
    let bucket = byColor.get(t.colorName);
    if (!bucket) { bucket = []; byColor.set(t.colorName, bucket); order.push(t.colorName); }
    bucket.push(t);
  }
  return order.map((colorName) => ({ colorName, tokens: byColor.get(colorName)! }));
}

// withComments: the primary :root/[data-theme] block groups declarations
// under a "/* {colorName} */" comment; the dark-mode @media fallback below
// repeats the same declarations with no comments at all (see baseline
// dark.css — the media block is a flat, uncommented declaration list).
function _themeDeclarationLines(tokens: ResolvedToken[], theme: string, indent: string, withComments: boolean): string[] {
  const lines: string[] = [];
  for (const group of _groupByColor(tokens, theme)) {
    if (withComments) lines.push("\n" + indent + "/* " + group.colorName + " */");
    for (const token of group.tokens) {
      lines.push(indent + "--" + token.segs.map((s) => _slug(s.label)).join("-") + ": " + token.value + ";");
    }
  }
  return lines;
}

export const fmtCSS = {
  source(config: ExportConfig): string {
    const lines = ["/* " + (config.name || "tokens") + " — source colors */", ":root {"];
    for (const entry of _eachSourceColor(config)) {
      lines.push("  --" + _slug(entry.cLabel) + ": " + entry.hex + ";");
      for (const alpha of entry.alphaVariants) {
        const { r, g, b, a } = alpha.rgba;
        lines.push("  --" + _slug(entry.cLabel) + "-alpha-" + alpha.opacity + ": rgba(" + r + ", " + g + ", " + b + ", " + a + ");");
      }
    }
    lines.push("}");
    return lines.join("\n");
  },

  scale(result: EngineResult, config: ExportConfig): string {
    const lines = ["/* " + (config.name || "tokens") + " — color scales */", ":root {"];
    let lastColor: string | null = null;
    for (const step of resolveScaleSteps(result, config)) {
      if (step.colorName !== lastColor) {
        lines.push("\n  /* " + step.colorName + " */");
        lastColor = step.colorName;
      }
      lines.push("  --" + _slug(step.cLabel) + "-" + _slug(step.stepKey) + ": " + step.value + ";");
    }
    lines.push("}");
    return lines.join("\n");
  },

  theme(result: EngineResult, tokens: ResolvedToken[], _config: ExportConfig, themeName: string, isFirst: boolean): string {
    const selector = isFirst
      ? ":root,\n[data-theme=\"" + themeName + "\"]"
      : "[data-theme=\"" + themeName + "\"]";
    const lines = ["/* " + themeName.toUpperCase() + " */", selector + " {"];
    if (!result.tokens || !result.tokens[themeName]) return lines.concat(["}"]).join("\n");
    lines.push(..._themeDeclarationLines(tokens, themeName, "  ", true));
    lines.push("}");
    if (themeName.toLowerCase() === "dark") {
      // OS-level dark mode fallback: repeat the same declarations inside the media query
      const mediaLines = ["\n@media (prefers-color-scheme: dark) {", "  :root:not([data-theme]) {"];
      mediaLines.push(..._themeDeclarationLines(tokens, themeName, "    ", false));
      mediaLines.push("  }\n}");
      lines.push(mediaLines.join("\n"));
    }
    return lines.join("\n");
  },
};
