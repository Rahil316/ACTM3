/**
 * exportEng/bundler.js
 * Orchestrates multi-format export bundle.
 * Runs in both Figma sandbox and browser (shared via build concatenation).
 * All formatters (fmtCSS, fmtSCSS, etc.) must be loaded before this file.
 */

function buildExportBundle(result, config, formats, appState) {
  var files = [];
  var themeKeys = Object.keys(result.tokens || {});
  var projectSlug = ((appState && appState.name) || config.name || "tokens")
    .toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  for (var fi = 0; fi < formats.length; fi++) {
    var fmt = formats[fi];

    if (fmt === "css") {
      files.push({ path: "css/scale.css", content: fmtCSS.scale(result, config) });
      for (var ti = 0; ti < themeKeys.length; ti++) {
        files.push({ path: "css/themes/" + _slug(themeKeys[ti]) + ".css", content: fmtCSS.theme(result, config, themeKeys[ti], ti === 0) });
      }
    }

    if (fmt === "scss") {
      files.push({ path: "scss/scale.scss",  content: fmtSCSS.scale(result, config) });
      files.push({ path: "scss/tokens.scss", content: fmtSCSS.tokens(result, config) });
      files.push({ path: "scss/index.scss",  content: fmtSCSS.index(result, config) });
    }

    if (fmt === "tailwind") {
      files.push({ path: "tailwind/tailwind.config.js", content: fmtTailwind.config(result, config) });
    }

    if (fmt === "dtcg") {
      files.push({ path: "dtcg/scale.json", content: fmtDTCG.scale(result, config) });
      for (var ti2 = 0; ti2 < themeKeys.length; ti2++) {
        files.push({ path: "dtcg/themes/" + _slug(themeKeys[ti2]) + ".json", content: fmtDTCG.theme(result, config, themeKeys[ti2]) });
      }
    }

    if (fmt === "style-dictionary") {
      files.push({ path: "style-dictionary/global.json", content: fmtStyleDictionary.global(result, config) });
      for (var ti3 = 0; ti3 < themeKeys.length; ti3++) {
        files.push({ path: "style-dictionary/" + _slug(themeKeys[ti3]) + ".json", content: fmtStyleDictionary.theme(result, config, themeKeys[ti3]) });
      }
    }

    if (fmt === "csv") {
      files.push({ path: "tokens.csv", content: ExportFormatter.toCSV(result, config) });
    }

    if (fmt === "ios-swift") {
      for (var ti4 = 0; ti4 < themeKeys.length; ti4++) {
        var swiftTheme = themeKeys[ti4];
        var swiftName = swiftTheme.charAt(0).toUpperCase() + swiftTheme.slice(1) + "Colors.swift";
        files.push({ path: "ios/" + swiftName, content: fmtSwift.file(result, config, swiftTheme) });
      }
    }

    if (fmt === "android") {
      for (var ti5 = 0; ti5 < themeKeys.length; ti5++) {
        var androidTheme = themeKeys[ti5];
        var qualifier = ti5 === 0 ? "values" : "values-" + _slug(androidTheme);
        files.push({ path: "android/res/" + qualifier + "/colors.xml", content: fmtAndroid.file(result, config, androidTheme) });
      }
    }

    if (fmt === "rn-ts") {
      files.push({ path: "rn/tokens/index.ts", content: fmtReactNative.index(result, config) });
      for (var ti6 = 0; ti6 < themeKeys.length; ti6++) {
        var rnTheme = themeKeys[ti6];
        files.push({ path: "rn/tokens/" + _slug(rnTheme) + ".ts", content: fmtReactNative.theme(result, config, rnTheme) });
      }
    }

    if (fmt === "wand") {
      files.push({ path: "config.wand", content: JSON.stringify(appState || {}, null, 2) });
    }
  }

  return files;
}
