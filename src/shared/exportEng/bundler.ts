import type { EngineResult, ExportConfig, ExportFile } from "./types";
import { _slug } from "./helpers";
import { fmtCSS } from "./fmtCSS";
import { fmtSCSS } from "./fmtSCSS";
import { fmtTailwind } from "./fmtTailwind";
import { fmtDTCG } from "./fmtDTCG";
import { fmtStyleDictionary } from "./fmtStyleDictionary";
import { fmtSwift } from "./fmtSwift";
import { fmtAndroid } from "./fmtAndroid";
import { fmtReactNative } from "./fmtReactNative";

// Maps a theme name to the correct Android resource qualifier directory.
// Android only natively supports values/ (default) and values-night/ (dark).
// Any other theme name gets a sanitised qualifier that must be applied programmatically.
function _androidQualifier(themeName: string, index: number): string {
  const lower = themeName.toLowerCase();
  if (index === 0) return "values";          // first theme is always the default
  if (lower === "dark") return "values-night";
  return `values-${_slug(themeName)}`;       // custom — comment in the XML explains it
}

// Returns a compact timestamp string: YYYYMMDD-HHmm (UTC)
function _timestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "-" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes())
  );
}

export function buildExportBundle(
  result: EngineResult,
  config: ExportConfig,
  formats: string[],
  projectStore?: Record<string, unknown>,
  timestamp?: number,
): ExportFile[] {
  const files: ExportFile[] = [];
  const themeKeys = Object.keys(result.tokens || {});
  const projectSlug = ((projectStore?.["name"] as string) || config.name || "tokens")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const ts = _timestamp(timestamp ?? 0);

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
        files.push({ path: `${pre("ios")}${name}`, content: fmtSwift.file(result, config, theme) });
      }
    }

    if (fmt === "android") {
      for (let ti = 0; ti < themeKeys.length; ti++) {
        // Android only understands values/ (default/light) and values-night/ (dark).
        // Any other theme is exported with a comment qualifier — handled in the formatter.
        const themeName = themeKeys[ti];
        const qualifier = _androidQualifier(themeName, ti);
        const isNonStandard = qualifier !== "values" && qualifier !== "values-night";
        files.push({ path: `${pre("android")}res/${qualifier}/colors.xml`, content: fmtAndroid.file(result, config, themeName, isNonStandard) });
      }
    }

    if (fmt === "rn-ts") {
      files.push({ path: `${pre("rn")}tokens/index.ts`, content: fmtReactNative.index(result, config) });
      for (const theme of themeKeys) {
        files.push({ path: `${pre("rn")}tokens/${_slug(theme)}.ts`, content: fmtReactNative.theme(result, config, theme) });
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
