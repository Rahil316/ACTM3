import type { EngineResult, ExportConfig, ExportFile } from "./types";
import { _slug, _projectSlug, _exportTimestamp } from "./helpers";
import { resolveExport, resolveScaleSteps } from "./resolve";
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
  // includeColorScalesCollection was previously NOT checked here — hasScales
  // only ever looked at whether the engine happened to compute scale data
  // (always true in Scale mode, unconditionally, regardless of this setting —
  // see clrEngine.ts). That meant turning the setting off in Scale mode had no
  // effect on exports even though it suppresses the collection in Figma sync.
  const hasScales = config.includeColorScalesCollection !== false && Object.keys(result.scales || {}).length > 0;
  const hasSource = config.includeSourceColors === true && (config.colors?.length ?? 0) > 0;

  for (const fmt of formats) {
    if (fmt === "css") {
      if (hasSource) files.push({ path: `${pre("css")}source.css`, content: fmtCSS.source(config), role: "source" });
      if (hasScales) files.push({ path: `${pre("css")}scale.css`, content: fmtCSS.scale(result, config), role: "scale" });
      const { tokens: cssTokens } = resolveExport(result, config);
      for (let ti = 0; ti < themeKeys.length; ti++) {
        files.push({ path: `${pre("css")}${_slug(themeKeys[ti])}.css`, content: fmtCSS.theme(result, cssTokens, config, themeKeys[ti], ti === 0), role: themeKeys[ti] });
      }
    }

    if (fmt === "scss") {
      if (hasSource) files.push({ path: `${pre("scss")}_source.scss`, content: fmtSCSS.source(config), role: "source" });
      if (hasScales) files.push({ path: `${pre("scss")}_scale.scss`, content: fmtSCSS.scale(result, config), role: "scale" });
      files.push({ path: `${pre("scss")}_tokens.scss`, content: fmtSCSS.tokens(result, config), role: "tokens" });
      files.push({ path: `${pre("scss")}index.scss`, content: fmtSCSS.index(result, config), role: "index" });
    }

    if (fmt === "tailwind") {
      files.push({ path: `${pre("tailwind")}tailwind.config.js`, content: fmtTailwind.config(result, config), role: "config" });
      // tokens.css is the scale/source companion — only include what applies
      if (hasSource) files.push({ path: `${pre("tailwind")}source.css`, content: fmtCSS.source(config), role: "source" });
      if (hasScales) files.push({ path: `${pre("tailwind")}tokens.css`, content: fmtCSS.scale(result, config), role: "scale" });
      const { tokens: twTokens } = resolveExport(result, config);
      for (let ti = 0; ti < themeKeys.length; ti++) {
        files.push({ path: `${pre("tailwind")}${_slug(themeKeys[ti])}.css`, content: fmtCSS.theme(result, twTokens, config, themeKeys[ti], ti === 0), role: themeKeys[ti] });
      }
    }

    if (fmt === "dtcg") {
      if (hasSource) files.push({ path: `${pre("dtcg")}source.json`, content: fmtDTCG.source(config), role: "source" });
      if (hasScales) files.push({ path: `${pre("dtcg")}scale.json`, content: fmtDTCG.scale(result, config), role: "scale" });
      const { tokens: dtcgTokens } = resolveExport(result, config);
      for (const theme of themeKeys) {
        files.push({ path: `${pre("dtcg")}${_slug(theme)}.json`, content: fmtDTCG.theme(result, dtcgTokens, config, theme), role: theme });
      }
    }

    if (fmt === "style-dictionary") {
      // global.json holds scale + source; skip only when both are empty
      if (hasScales || hasSource) files.push({ path: `${pre("style-dictionary")}global.json`, content: fmtStyleDictionary.global(result, config), role: "global" });
      const { tokens: sdTokens } = resolveExport(result, config);
      for (const theme of themeKeys) {
        files.push({ path: `${pre("style-dictionary")}${_slug(theme)}.json`, content: fmtStyleDictionary.theme(result, sdTokens, config, theme), role: theme });
      }
    }

    if (fmt === "ios-swift") {
      const { tokens: swiftTokens } = resolveExport(result, config);
      const swiftScaleSteps = resolveScaleSteps(result, config);
      for (const theme of themeKeys) {
        const name = theme.charAt(0).toUpperCase() + theme.slice(1) + "Colors.swift";
        files.push({ path: `${pre("ios-swift")}${name}`, content: fmtSwift.file(result, swiftTokens, swiftScaleSteps, config, theme), role: theme });
      }
    }

    if (fmt === "android") {
      // Android only understands values/ (default/light) and values-night/ (dark).
      // Any other theme is exported with a comment qualifier — handled in the formatter.
      // role = theme name: the qualifier DIRECTORY is what a caller would want
      // to remap (colors.xml itself is a fixed Android convention, not
      // something to rename).
      const qualifiers = _androidQualifiers(themeKeys);
      const { tokens: androidTokens } = resolveExport(result, config);
      const androidScaleSteps = resolveScaleSteps(result, config);
      for (let ti = 0; ti < themeKeys.length; ti++) {
        const themeName = themeKeys[ti];
        const qualifier = qualifiers[ti];
        const isNonStandard = qualifier !== "values" && qualifier !== "values-night";
        files.push({ path: `${pre("android")}res/${qualifier}/colors.xml`, content: fmtAndroid.file(result, androidTokens, androidScaleSteps, config, themeName, isNonStandard), role: themeName });
      }
    }

    if (fmt === "rn-ts") {
      files.push({ path: `${pre("rn-ts")}tokens/index.ts`, content: fmtReactNative.index(result, config), role: "index" });
      const { tokens: rnTokens } = resolveExport(result, config);
      const rnScaleSteps = resolveScaleSteps(result, config);
      for (const theme of themeKeys) {
        files.push({ path: `${pre("rn-ts")}tokens/${_slug(theme)}.ts`, content: fmtReactNative.theme(result, rnTokens, rnScaleSteps, config, theme), role: theme });
      }
    }

    if (fmt === "csv") {
      files.push({ path: `${projectSlug}_csv_${ts}.csv`, content: "" }); // filled by docGen in index.ts
    }

    if (fmt === "json") {
      files.push({ path: `${projectSlug}_json_${ts}.json`, content: "" }); // filled by docGen in index.ts
    }

    if (fmt === "wand") {
      // Current config only — NOT the full publish history. `versions` is an
      // unbounded, ever-growing log (one full state snapshot appended per
      // publish, no cap anywhere in the codebase); including it here meant a
      // project published 100 times produced a .wand file with 100 nearly-
      // identical copies of its own config. Full history export lives at
      // "wand-backup" below, under its own explicit label.
      const { versions: _versions, ...currentStateOnly } = (projectStore || {}) as Record<string, unknown> & { versions?: unknown };
      files.push({ path: `${projectSlug}_wand_${ts}.wand`, content: JSON.stringify(currentStateOnly, null, 2) });
    }

    if (fmt === "wand-backup") {
      // Full plugin backup — current config AND every saved version, exactly
      // what projectStore holds. Distinct, explicitly-labeled format so a
      // plain .wand export (above) never surprises the user with the entire
      // publish history bundled in.
      files.push({ path: `${projectSlug}_backup_${ts}.wand`, content: JSON.stringify(projectStore || {}, null, 2) });
    }
  }

  return files;
}
