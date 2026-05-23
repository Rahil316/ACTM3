/**
 * ============================================================================
 * Token Wand — Export Engine Test Suite
 * Tests all export formats against all presets.
 * Set EXPORT_TESTS_ENABLED = true to run on plugin load (DevTools console).
 *
 * Checks format correctness against each platform's own standards:
 *   CSS       — W3C custom property syntax, selector structure, media queries
 *   SCSS      — variable syntax, map syntax, mixin, @forward
 *   Tailwind  — valid module.exports, theme.extend.colors shape
 *   DTCG      — W3C DTCG $value/$type fields, alias brace syntax
 *   SD        — Style Dictionary v3 value/type/attributes shape
 *   Swift     — import statements, extension syntax, static let
 *   Android   — XML declaration, <resources>, #AARRGGBB format
 *   RN TS     — as const, useTokens signature, import/export structure
 *   CSV       — header rows, correct column count per row
 *   ZIP files — correct file paths, non-empty content per format
 * ============================================================================
 */

const EXPORT_TESTS_ENABLED = false;

(function () {
  if (!EXPORT_TESTS_ENABLED) return;
  if (typeof PRESETS === "undefined" || typeof translateConfig === "undefined" || typeof variableMaker === "undefined") {
    console.warn("[export-tests] Required globals not available. Run after all scripts load.");
    return;
  }

  // ── RUNNER ──────────────────────────────────────────────────────────────────

  const _results = [];
  let _totalPass = 0, _totalFail = 0, _totalWarn = 0;

  function suite(label) {
    const s = { label, checks: [], pass: 0, fail: 0, warn: 0 };
    _results.push(s);
    return {
      pass(msg)         { s.checks.push({ ok: true,  msg }); s.pass++; _totalPass++; },
      fail(msg, detail) { s.checks.push({ ok: false, msg, detail }); s.fail++; _totalFail++; },
      warn(msg)         { s.checks.push({ ok: "warn", msg }); s.warn++; _totalWarn++; },
      assert(msg, cond, detail) { cond ? this.pass(msg) : this.fail(msg, detail); },
      assertMatch(msg, str, pattern) { this.assert(msg, pattern.test(str), str.substring(0, 120)); },
      assertCount(msg, arr, min)     { this.assert(msg + " (got " + arr.length + ", need ≥" + min + ")", arr.length >= min, arr.length); },
    };
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────────

  function buildForPreset(preset) {
    const config = translateConfig(preset.config);
    const result = variableMaker(config);
    return { config, result };
  }

  function themeKeys(result) { return Object.keys(result.tokens || {}); }

  function countTokens(result) {
    let n = 0;
    const themes = themeKeys(result);
    for (const t of themes) {
      const tm = result.tokens[t];
      if (!tm) continue;
      for (const c of Object.values(tm))
        for (const r of Object.values(c))
          n += Object.keys(r).length;
    }
    return n;
  }

  function countScaleSteps(result) {
    let n = 0;
    for (const scale of Object.values(result.scales || {})) n += Object.keys(scale).length;
    return n;
  }

  // ── FORMAT VALIDATORS ────────────────────────────────────────────────────────

  function testCSS(s, result, config, hasScales) {
    const themes = themeKeys(result);

    // scale file
    const scale = fmtCSS.scale(result, config);
    s.assertMatch("CSS scale: starts with :root", scale, /^\s*\/\*.*\*\/\s*\n:root\s*\{/);
    s.assertMatch("CSS scale: closes :root", scale, /\}\s*$/);
    if (hasScales) {
      s.assertMatch("CSS scale: has -- var declarations", scale, /--[a-z0-9-]+:\s*#[0-9a-fA-F]{3,6}/);
      const scaleVars = (scale.match(/--[a-z]/g) || []).length;
      s.assertCount("CSS scale: has scale variables", { length: scaleVars }, countScaleSteps(result) * 0.8);
    } else {
      s.warn("CSS scale: no scale vars (direct mode — expected)");
    }

    // per-theme files
    for (let ti = 0; ti < themes.length; ti++) {
      const t = themes[ti];
      const css = fmtCSS.theme(result, config, t, ti === 0);
      s.assertMatch("CSS theme[" + t + "]: has selector", css, /\[data-theme=|:root/);
      s.assertMatch("CSS theme[" + t + "]: has -- vars", css, /--[a-z0-9-]+:\s*#/);
      s.assertMatch("CSS theme[" + t + "]: closes block", css, /\}\s*$/);
      if (t.toLowerCase() === "dark") {
        s.assertMatch("CSS dark: has @media prefers-color-scheme", css, /@media\s*\(prefers-color-scheme:\s*dark\)/);
        s.assertMatch("CSS dark: has :root:not([data-theme])", css, /:root:not\(\[data-theme\]\)/);
      }
    }
  }

  function testSCSS(s, result, config, hasScales) {
    const scale  = fmtSCSS.scale(result, config);
    const tokens = fmtSCSS.tokens(result, config);
    const index  = fmtSCSS.index(result, config);

    // scale.scss
    if (hasScales) {
      s.assertMatch("SCSS scale: has $variable declarations", scale, /\$[a-z0-9-]+:\s*#[0-9a-fA-F]/);
      s.assertMatch("SCSS scale: has $scale- map", scale, /\$scale-[a-z0-9-]+:\s*\(/);
      s.assertMatch("SCSS scale: map closes with );", scale, /\);\s*\n/);
    } else {
      s.warn("SCSS scale: no scale vars (direct mode — expected)");
    }

    // tokens.scss
    s.assertMatch("SCSS tokens: has $tokens- map", tokens, /\$tokens-[a-z]+:/);
    s.assertMatch("SCSS tokens: token map has string keys", tokens, /\"[a-z0-9-]+\":\s*[\$#]/);
    s.assertMatch("SCSS tokens: @forward 'scale'", tokens, /@forward 'scale'/);

    // index.scss
    s.assertMatch("SCSS index: has apply-theme mixin", index, /@mixin apply-theme/);
    s.assertMatch("SCSS index: mixin uses @each", index, /@each \$name, \$value in \$tokens/);
    s.assertMatch("SCSS index: has :root selector output", index, /:root[^{]*\{/);
    s.assertMatch("SCSS index: includes apply-theme call", index, /@include apply-theme/);

    const themes = themeKeys(result);
    if (themes.find(t => t.toLowerCase() === "dark")) {
      s.assertMatch("SCSS index: has OS dark fallback", index, /@media\s*\(prefers-color-scheme:\s*dark\)/);
    }
  }

  function testTailwind(s, result, config) {
    const out = fmtTailwind.config(result, config);
    s.assertMatch("Tailwind: starts with @type jsdoc", out, /\/\*\* @type/);
    s.assertMatch("Tailwind: module.exports =", out, /module\.exports\s*=/);
    s.assertMatch("Tailwind: has theme.extend.colors", out, /theme[\s\S]*extend[\s\S]*colors/);
    s.assertMatch("Tailwind: colors use var(--)", out, /var\(--[a-z0-9-]+\)/);
    s.assertMatch("Tailwind: has plugins: []", out, /plugins:\s*\[\]/);
    // Colors are nested objects
    const colorKeys = Object.keys(result.scales || {});
    if (colorKeys.length > 0) {
      const firstColor = _slug(_colorLabel(colorKeys[0], config));
      s.assertMatch("Tailwind: first color group present", out, new RegExp('"' + firstColor + '"\\s*:\\s*\\{'));
    }
  }

  function testDTCG(s, result, config, hasScales) {
    // scale
    let scaleJson;
    try { scaleJson = JSON.parse(fmtDTCG.scale(result, config)); s.pass("DTCG scale: valid JSON"); }
    catch(e) { s.fail("DTCG scale: invalid JSON", e.message); return; }

    const scaleColors = Object.keys(scaleJson);
    if (!hasScales) { s.warn("DTCG scale: no color groups (direct mode — expected)"); return; }
    s.assertCount("DTCG scale: has color groups", scaleColors, 1);
    const firstColor = scaleJson[scaleColors[0]];
    if (!firstColor) return;
    const firstStep = Object.values(firstColor)[0];
    s.assert("DTCG scale: $value field present", firstStep && firstStep["$value"], firstStep);
    s.assert("DTCG scale: $type is 'color'", firstStep && firstStep["$type"] === "color", firstStep && firstStep["$type"]);
    s.assertMatch("DTCG scale: $value is hex", String((firstStep || {})["$value"]), /^#[0-9A-Fa-f]{6}$/);

    // themes
    const themes = themeKeys(result);
    for (const t of themes) {
      try { JSON.parse(fmtDTCG.theme(result, config, t)); s.pass("DTCG theme[" + t + "]: valid JSON"); }
      catch(e) { s.fail("DTCG theme[" + t + "]: invalid JSON", e.message); continue; }

      // Check alias references
      const raw = fmtDTCG.theme(result, config, t);
      const aliases = raw.match(/\{[a-z0-9-]+\.[a-z0-9-]+\}/g) || [];
      if (aliases.length > 0) {
        s.assertMatch("DTCG theme[" + t + "]: alias uses dot-path {color.step}", aliases[0], /\{[a-z0-9-]+\.[a-z0-9-]+\}/);
      } else {
        // direct mode presets may have no aliases
        s.warn("DTCG theme[" + t + "]: no alias references (direct mode or all resolved to hex)");
      }
    }
  }

  function testStyleDictionary(s, result, config, hasScales) {
    // global (scale palette — only populated in scale mode)
    let globalJson;
    try { globalJson = JSON.parse(fmtStyleDictionary.global(result, config)); s.pass("SD global: valid JSON"); }
    catch(e) { s.fail("SD global: invalid JSON", e.message); return; }

    if (hasScales) {
      s.assert("SD global: top-level 'color' key", !!globalJson.color, Object.keys(globalJson));
      const firstColorGroup = Object.values(globalJson.color || {})[0] || {};
      const firstToken = Object.values(firstColorGroup)[0];
      s.assert("SD global: token has 'value'", firstToken && firstToken.value !== undefined, firstToken);
      s.assert("SD global: token has 'type'", firstToken && firstToken.type === "color", firstToken && firstToken.type);
      s.assert("SD global: token has 'attributes'", firstToken && typeof firstToken.attributes === "object", firstToken);
    } else {
      s.warn("SD global: no scale tokens (direct mode — expected)");
    }

    // themes
    const themes = themeKeys(result);
    for (const t of themes) {
      let themeJson;
      try { themeJson = JSON.parse(fmtStyleDictionary.theme(result, config, t)); s.pass("SD theme[" + t + "]: valid JSON"); }
      catch(e) { s.fail("SD theme[" + t + "]: invalid JSON", e.message); continue; }

      s.assert("SD theme[" + t + "]: has 'color' key", !!themeJson.color, Object.keys(themeJson));
      const raw = fmtStyleDictionary.theme(result, config, t);
      // SD aliases use {color.group.step} brace syntax
      const aliases = raw.match(/"\{color\.[^}]+\}"/g) || [];
      if (aliases.length > 0) {
        s.assertMatch("SD theme[" + t + "]: alias brace syntax", aliases[0], /"\{color\.[a-z0-9.-]+\}"/);
      } else {
        s.warn("SD theme[" + t + "]: no aliases (direct mode)");
      }
    }
  }

  function testSwift(s, result, config) {
    const themes = themeKeys(result);
    for (const t of themes) {
      const swift = fmtSwift.file(result, config, t);
      s.assertMatch("Swift[" + t + "]: import UIKit", swift, /import UIKit/);
      s.assertMatch("Swift[" + t + "]: import SwiftUI", swift, /import SwiftUI/);
      s.assertMatch("Swift[" + t + "]: extension UIColor", swift, /extension UIColor\s*\{/);
      s.assertMatch("Swift[" + t + "]: extension Color", swift, /extension Color\s*\{/);
      s.assertMatch("Swift[" + t + "]: static let declarations", swift, /static let [a-zA-Z]+ =/);
      s.assertMatch("Swift[" + t + "]: UIColor(red: ... alpha:)", swift, /UIColor\(red:\s*[\d.]+,\s*green:\s*[\d.]+,\s*blue:\s*[\d.]+,\s*alpha:\s*1\)/);
      s.assertMatch("Swift[" + t + "]: Color(red:)", swift, /Color\(red:\s*[\d.]+/);
      // Values must be in 0.0–1.0 range
      const vals = swift.match(/red:\s*([\d.]+)/g) || [];
      let allInRange = vals.every(v => { const n = parseFloat(v.replace("red:", "").trim()); return n >= 0 && n <= 1; });
      s.assert("Swift[" + t + "]: color components in 0–1 range", allInRange, vals.slice(0, 3));
      // MARK sections
      s.assertMatch("Swift[" + t + "]: MARK scale section", swift, /\/\/ MARK: - UIColor Scale/);
      s.assertMatch("Swift[" + t + "]: MARK semantic section", swift, /\/\/ MARK: - UIColor Semantic/);
    }
  }

  function testAndroid(s, result, config) {
    const themes = themeKeys(result);
    for (let ti = 0; ti < themes.length; ti++) {
      const t = themes[ti];
      const xml = fmtAndroid.file(result, config, t);
      s.assertMatch("Android[" + t + "]: XML declaration", xml, /^<\?xml version="1\.0" encoding="utf-8"\?>/);
      s.assertMatch("Android[" + t + "]: <resources> root", xml, /<resources>/);
      s.assertMatch("Android[" + t + "]: closes </resources>", xml, /<\/resources>/);
      s.assertMatch("Android[" + t + "]: <color name=...> elements", xml, /<color name="[a-z0-9_]+">/);
      // Android color format: #AARRGGBB (8 chars after #)
      const colorVals = xml.match(/#[0-9A-F]{8}/g) || [];
      s.assertCount("Android[" + t + "]: has #AARRGGBB values", colorVals, 1);
      s.assert("Android[" + t + "]: all colors start with #FF (opaque)", colorVals.every(v => v.startsWith("#FF")), colorVals.slice(0, 3));
      // resource names must be snake_case (no hyphens, no uppercase)
      const names = xml.match(/name="([^"]+)"/g) || [];
      const badNames = names.filter(n => /[A-Z\-]/.test(n));
      s.assert("Android[" + t + "]: names are snake_case", badNames.length === 0, badNames.slice(0, 3));
      // qualifier logic
      const qualifier = ti === 0 ? "values" : "values-" + t.toLowerCase();
      s.pass("Android[" + t + "]: would map to res/" + qualifier + "/colors.xml");
    }
  }

  function testReactNative(s, result, config) {
    const themes = themeKeys(result);

    // index.ts
    const index = fmtReactNative.index(result, config);
    s.assertMatch("RN index: imports theme files", index, /import\s*\{/);
    s.assertMatch("RN index: Theme type union", index, /type Theme\s*=/);
    s.assertMatch("RN index: themeMap object", index, /const themeMap\s*=/);
    s.assertMatch("RN index: as const assertion", index, /as const/);
    s.assertMatch("RN index: useTokens function", index, /function useTokens\(theme: Theme\)/);
    s.assertMatch("RN index: re-exports themes", index, /export\s*\{/);
    for (const t of themes) {
      s.assertMatch("RN index: imports " + t, index, new RegExp("import.*" + _slug(t)));
    }

    // per-theme files
    for (const t of themes) {
      const themeFile = fmtReactNative.theme(result, config, t);
      s.assertMatch("RN theme[" + t + "]: export const ...Tokens", themeFile, /export const [a-zA-Z0-9]+Tokens\s*=/);
      s.assertMatch("RN theme[" + t + "]: as const assertion", themeFile, /\}\s*as const/);
      if (countScaleSteps(result) > 0) {
        s.assertMatch("RN theme[" + t + "]: scale key", themeFile, /scale\s*:\s*\{/);
      } else {
        s.warn("RN theme[" + t + "]: scale key skipped (direct mode — no scales)");
      }
      s.assertMatch("RN theme[" + t + "]: tokens key", themeFile, /tokens\s*:\s*\{/);
      s.assertMatch("RN theme[" + t + "]: hex string values", themeFile, /"#[0-9A-Fa-f]{6}"\s+as string/);
      s.assertMatch("RN theme[" + t + "]: type export", themeFile, /export type [a-zA-Z0-9]+TokensType/);
    }
  }

  function testCSV(s, result, config) {
    const csv = ExportFormatter.toCSV(result, config);
    s.assertMatch("CSV: COLOR SCALES section header", csv, /COLOR SCALES/);
    s.assertMatch("CSV: ROLE TOKENS section header", csv, /ROLE TOKENS/);
    s.assertMatch("CSV: scale header row starts with Group,Step,Hex", csv, /Group,Step,Hex/);
    s.assertMatch("CSV: scale header has Contrast column", csv, /Contrast/);
    s.assertMatch("CSV: token header row", csv, /Color,Role,Variation,Theme,Hex,Contrast,Rating,Adjusted/);

    // Derive expected column counts from the actual headers
    const allLines = csv.split("\n");
    const scaleHeaderLine = allLines.find(l => l.startsWith("Group,Step,Hex"));
    const tokenHeaderLine = allLines.find(l => l.startsWith("Color,Role,Variation"));
    const scaleColCount = scaleHeaderLine ? scaleHeaderLine.split(",").length : 7;
    const tokenColCount = tokenHeaderLine ? tokenHeaderLine.split(",").length : 8;

    const dataLines = allLines.filter(l => l.trim() && !l.startsWith("COLOR") && !l.startsWith("ROLE") && l !== scaleHeaderLine && l !== tokenHeaderLine);
    let badRows = 0;
    dataLines.forEach(line => {
      const cols = line.split(",").length;
      if (cols !== scaleColCount && cols !== tokenColCount) badRows++;
    });
    s.assert("CSV: all data rows match header column count", badRows === 0, badRows + " bad rows");

    // Hex values must be valid
    const hexVals = csv.match(/#[0-9A-Fa-f]{6}/g) || [];
    s.assertCount("CSV: contains hex values", hexVals, countScaleSteps(result));
  }

  function testBundler(s, result, config, appState) {
    const allFormats = ["css","scss","tailwind","dtcg","style-dictionary","ios-swift","android","rn-ts","csv","wand"];
    const files = buildExportBundle(result, config, allFormats, appState);

    s.assertCount("Bundle: produces files", files, allFormats.length);
    files.forEach(f => {
      s.assert("Bundle file has path",    typeof f.path === "string" && f.path.length > 0, f);
      s.assert("Bundle file has content", typeof f.content === "string" && f.content.length > 0, f.path);
    });

    // Path structure checks per format
    const paths = files.map(f => f.path);
    s.assert("Bundle: css/scale.css present",               paths.includes("css/scale.css"), paths);
    s.assert("Bundle: scss/scale.scss present",             paths.includes("scss/scale.scss"), paths);
    s.assert("Bundle: tailwind/tailwind.config.js present", paths.includes("tailwind/tailwind.config.js"), paths);
    s.assert("Bundle: dtcg/scale.json present",             paths.includes("dtcg/scale.json"), paths);
    s.assert("Bundle: style-dictionary/global.json present", paths.includes("style-dictionary/global.json"), paths);
    s.assert("Bundle: rn/tokens/index.ts present",          paths.includes("rn/tokens/index.ts"), paths);
    s.assert("Bundle: tokens.csv present",                  paths.includes("tokens.csv"), paths);
    s.assert("Bundle: config.wand present",                 paths.includes("config.wand"), paths);

    // Per-theme files
    const themes = themeKeys(result);
    for (const t of themes) {
      const tSlug = _slug(t);
      s.assert("Bundle: css/themes/" + tSlug + ".css", paths.includes("css/themes/" + tSlug + ".css"), paths.filter(p => p.startsWith("css")));
      s.assert("Bundle: dtcg/themes/" + tSlug + ".json", paths.includes("dtcg/themes/" + tSlug + ".json"), paths.filter(p => p.startsWith("dtcg")));
      s.assert("Bundle: rn/tokens/" + tSlug + ".ts", paths.includes("rn/tokens/" + tSlug + ".ts"), paths.filter(p => p.startsWith("rn")));
    }

    // No duplicate paths
    const uniquePaths = new Set(paths);
    s.assert("Bundle: no duplicate file paths", uniquePaths.size === paths.length, paths.length - uniquePaths.size + " duplicates");

    // wand is valid JSON
    const wandFile = files.find(f => f.path === "config.wand");
    if (wandFile) {
      try { JSON.parse(wandFile.content); s.pass("Bundle: config.wand is valid JSON"); }
      catch(e) { s.fail("Bundle: config.wand is invalid JSON", e.message); }
    }
  }

  function testPreset(preset) {
    const label = "[" + preset.badge + "] " + preset.name;
    const s = suite(label);

    let config, result;
    try {
      ({ config, result } = buildForPreset(preset));
    } catch(e) {
      s.fail("buildForPreset failed", e.message);
      return;
    }

    const steps  = countScaleSteps(result);
    const tokens = countTokens(result);
    const themes = themeKeys(result);

    const hasScales = steps > 0;

    // Basic pipeline health
    if (hasScales) {
      s.assert("Engine: produces scales", true, steps);
    } else {
      s.warn("Engine: no scales (direct mode — expected)");
    }
    s.assertCount("Engine: themes",            themes, Math.max(1, preset.config.themes.length - 1));
    s.assert("Engine: produces tokens",        tokens > 0, tokens);
    s.assert("Engine: no critical errors",     !result.errors || !result.errors.critical || result.errors.critical.length === 0,
      result.errors && result.errors.critical && result.errors.critical.map(e => e.error));

    // Format tests
    testCSS(s, result, config, hasScales);
    testSCSS(s, result, config, hasScales);
    testTailwind(s, result, config);
    testDTCG(s, result, config, hasScales);
    testStyleDictionary(s, result, config, hasScales);
    testSwift(s, result, config);
    testAndroid(s, result, config);
    testReactNative(s, result, config);
    testCSV(s, result, config);
    testBundler(s, result, config, preset.config);
  }

  // ── RUN ──────────────────────────────────────────────────────────────────────

  console.group("%c Token Wand — Export Engine Tests", "font-size:14px;font-weight:bold;color:#6366f1");
  console.log("Running against " + PRESETS.length + " presets × 10 formats…\n");

  PRESETS.forEach(testPreset);

  // ── REPORT ───────────────────────────────────────────────────────────────────

  console.log("\n" + "─".repeat(70));
  console.log("%c RESULTS BY PRESET", "font-weight:bold;font-size:12px");
  console.log("─".repeat(70));

  _results.forEach(r => {
    const status = r.fail === 0 ? (r.warn > 0 ? "⚠" : "✓") : "✗";
    const color  = r.fail === 0 ? (r.warn > 0 ? "#f59e0b" : "#22c55e") : "#ef4444";
    const label  = `%c ${status} ${r.label}`;
    const detail = `  ${r.pass} pass  ${r.fail} fail  ${r.warn} warn`;
    console.log(label + "  " + detail, "color:" + color + ";font-weight:bold");

    // Print failures inline
    r.checks.filter(c => !c.ok && c.ok !== "warn").forEach(c => {
      console.error("    ✗", c.msg, c.detail !== undefined ? "→ " + JSON.stringify(c.detail).substring(0, 100) : "");
    });
    r.checks.filter(c => c.ok === "warn").forEach(c => {
      console.warn("    ⚠", c.msg);
    });
  });

  console.log("\n" + "─".repeat(70));
  console.log("%c SUMMARY", "font-weight:bold;font-size:12px");
  console.log("─".repeat(70));

  const presetsOk   = _results.filter(r => r.fail === 0).length;
  const presetsFail = _results.filter(r => r.fail > 0).length;

  console.log(`Presets:   ${PRESETS.length} total | ${presetsOk} fully passing | ${presetsFail} with failures`);
  console.log(`Checks:    ${_totalPass + _totalFail + _totalWarn} total | %c${_totalPass} pass%c | %c${_totalFail} fail%c | %c${_totalWarn} warn`,
    "color:#22c55e;font-weight:bold","","color:#ef4444;font-weight:bold","","color:#f59e0b;font-weight:bold");

  if (_totalFail === 0) {
    console.log("%c ✓ All export formats valid across all presets.", "color:#22c55e;font-size:13px;font-weight:bold");
  } else {
    console.warn(`%c ✗ ${_totalFail} check(s) failed — see details above.`, "color:#ef4444;font-size:13px;font-weight:bold");
  }

  // Format breakdown table
  const formatIds = ["css","scss","tailwind","dtcg","style-dictionary","ios-swift","android","rn-ts","csv","bundle"];
  console.log("\n%c Format × Preset matrix (✓ = all pass, ✗ = failures, ─ = not tested)", "color:gray;font-size:11px");

  const matrixRows = _results.map(r => {
    const row = { preset: r.label.replace(/^\[.*?\]\s*/, "") };
    const byFormat = {};
    r.checks.forEach(c => {
      const fmtMatch = c.msg.match(/^(CSS|SCSS|Tailwind|DTCG|SD|Swift|Android|RN|CSV|Bundle|Engine)/i);
      if (fmtMatch) {
        const key = fmtMatch[1].toLowerCase();
        if (!byFormat[key]) byFormat[key] = { pass: 0, fail: 0 };
        if (c.ok === true) byFormat[key].pass++;
        else if (c.ok === false) byFormat[key].fail++;
      }
    });
    formatIds.forEach(f => {
      const key = f === "style-dictionary" ? "sd" : f === "ios-swift" ? "swift" : f === "rn-ts" ? "rn" : f;
      const entry = byFormat[key] || byFormat[f] || null;
      row[f] = entry ? (entry.fail > 0 ? "✗" : "✓") : "─";
    });
    return row;
  });

  console.table(matrixRows);
  console.groupEnd();

})();
