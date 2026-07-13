import type { EngineResult, ExportConfig, ExportFile } from "./types";
import { _slug, _projectSlug, _exportTimestamp } from "./helpers";
import { fmtCSS } from "./fmtCSS";
import { fmtSCSS } from "./fmtSCSS";
import { fmtTailwind } from "./fmtTailwind";
import { fmtDTCG } from "./fmtDTCG";
import { fmtStyleDictionary } from "./fmtStyleDictionary";
import { fmtSwift } from "./fmtSwift";
import { fmtAndroid } from "./fmtAndroid";
import { fmtReactNative } from "./fmtReactNative";

// Maps each theme name to a unique Android resource qualifier directory.
// Android only natively supports values/ (default) and values-night/ (dark).
// Any other theme name gets a sanitised qualifier that must be applied programmatically.
// Two theme names can slug to the same qualifier (e.g. "Dark Mode" / "dark-mode", or
// two punctuation-only names both slugging to ""); when that happens the later theme(s)
// get a numeric suffix so no qualifier — and therefore no colors.xml — is silently dropped.
function _androidQualifiers(themeNames: string[]): string[] {
  const seen = new Map<string, number>();
  return themeNames.map((themeName, index) => {
    const lower = themeName.toLowerCase();
    let base: string;
    if (index === 0) base = "values";
    else if (lower === "dark") base = "values-night";
    else base = `values-${_slug(themeName) || "theme"}`;

    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  });
}

export function buildExportBundle(
  result: EngineResult,
  config: ExportConfig,
  formats: string[],
  projectStore: Record<string, unknown> | undefined,
  timestamp: number,
): ExportFile[] {
  const files: ExportFile[] = [];
  const themeKeys = Object.keys(result.tokens || {});
  const projectSlug = _projectSlug((projectStore?.["name"] as string) || config.name);
  const ts = _exportTimestamp(timestamp);

  // Single-format exports use a flat filename: {project}_{tech}_{ts}.ext
  // Multi-file formats within a zip use {tech}/ subfolders (no project prefix inside).
  const multi = formats.length > 1;
  const pre = (tech: string) => multi ? `${tech}/` : `${projectSlug}_${tech}_${ts}/`;
  const hasScales = Object.keys(result.scales || {}).length > 0;

  for (const fmt of formats) {
    if (fmt === "css") {
      if (hasScales) files.push({ path: `${pre("css")}scale.css`, content: fmtCSS.scale(result, config) });
      for (let ti = 0; ti < themeKeys.length; ti++) {
        files.push({ path: `${pre("css")}${_slug(themeKeys[ti])}.css`, content: fmtCSS.theme(result, config, themeKeys[ti], ti === 0) });
      }
    }

    if (fmt === "scss") {
      if (hasScales) files.push({ path: `${pre("scss")}_scale.scss`, content: fmtSCSS.scale(result, config) });
      files.push({ path: `${pre("scss")}_tokens.scss`, content: fmtSCSS.tokens(result, config) });
      files.push({ path: `${pre("scss")}index.scss`, content: fmtSCSS.index(result, config) });
    }

    if (fmt === "tailwind") {
      files.push({ path: `${pre("tailwind")}tailwind.config.js`, content: fmtTailwind.config(result, config) });
      // tokens.css is the scale companion — only include when there are scales
      if (hasScales) files.push({ path: `${pre("tailwind")}tokens.css`, content: fmtCSS.scale(result, config) });
      for (let ti = 0; ti < themeKeys.length; ti++) {
        files.push({ path: `${pre("tailwind")}${_slug(themeKeys[ti])}.css`, content: fmtCSS.theme(result, config, themeKeys[ti], ti === 0) });
      }
    }

    if (fmt === "dtcg") {
      if (hasScales) files.push({ path: `${pre("dtcg")}scale.json`, content: fmtDTCG.scale(result, config) });
      for (const theme of themeKeys) {
        files.push({ path: `${pre("dtcg")}${_slug(theme)}.json`, content: fmtDTCG.theme(result, config, theme) });
      }
    }

    if (fmt === "style-dictionary") {
      // global.json only contains scales; skip when empty
      if (hasScales) files.push({ path: `${pre("style-dictionary")}global.json`, content: fmtStyleDictionary.global(result, config) });
      for (const theme of themeKeys) {
        files.push({ path: `${pre("style-dictionary")}${_slug(theme)}.json`, content: fmtStyleDictionary.theme(result, config, theme) });
      }
    }

    if (fmt === "ios-swift") {
      for (const theme of themeKeys) {
        const name = theme.charAt(0).toUpperCase() + theme.slice(1) + "Colors.swift";
        files.push({ path: `${pre("ios-swift")}${name}`, content: fmtSwift.file(result, config, theme) });
      }
    }

    if (fmt === "android") {
      // Android only understands values/ (default/light) and values-night/ (dark).
      // Any other theme is exported with a comment qualifier — handled in the formatter.
      const qualifiers = _androidQualifiers(themeKeys);
      for (let ti = 0; ti < themeKeys.length; ti++) {
        const themeName = themeKeys[ti];
        const qualifier = qualifiers[ti];
        const isNonStandard = qualifier !== "values" && qualifier !== "values-night";
        files.push({ path: `${pre("android")}res/${qualifier}/colors.xml`, content: fmtAndroid.file(result, config, themeName, isNonStandard) });
      }
    }

    if (fmt === "rn-ts") {
      files.push({ path: `${pre("rn-ts")}tokens/index.ts`, content: fmtReactNative.index(result, config) });
      for (const theme of themeKeys) {
        files.push({ path: `${pre("rn-ts")}tokens/${_slug(theme)}.ts`, content: fmtReactNative.theme(result, config, theme) });
      }
    }

    if (fmt === "csv") {
      files.push({ path: `${projectSlug}_csv_${ts}.csv`, content: "" }); // filled by docGen in index.ts
    }

    if (fmt === "json") {
      files.push({ path: `${projectSlug}_json_${ts}.json`, content: "" }); // filled by docGen in index.ts
    }

    if (fmt === "wand") {
      files.push({ path: `${projectSlug}_wand_${ts}.wand`, content: JSON.stringify(projectStore || {}, null, 2) });
    }
  }

  return files;
}
