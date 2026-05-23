/**
 * exportEng/fmtCSS.js
 * CSS custom properties — scale.css + per-theme semantic files.
 */

var fmtCSS = {

  // Scale variables only → :root block
  scale: function(result, config) {
    var lines = ["/" + "* " + (config.name || "tokens") + " — color scales *" + "/", ":root {"];
    var scaleNames = Object.keys(result.scales || {});
    for (var ci = 0; ci < scaleNames.length; ci++) {
      var colorName = scaleNames[ci];
      var cLabel = _colorLabel(colorName, config);
      var scale = result.scales[colorName];
      lines.push("\n  /" + "* " + colorName + " *" + "/");
      var steps = Object.keys(scale);
      for (var si = 0; si < steps.length; si++) {
        var step = steps[si];
        var entry = scale[step];
        lines.push("  --" + _slug(cLabel) + "-" + _slug(_stepLabel(step, config)) + ": " + entry.value + ";");
      }
    }
    lines.push("}");
    return lines.join("\n");
  },

  // Semantic tokens for one theme → [data-theme] block
  theme: function(result, config, themeName, isFirst) {
    var selector = isFirst
      ? ":root,\n[data-theme=\"" + themeName + "\"]"
      : "[data-theme=\"" + themeName + "\"]";
    var lines = ["/" + "* " + themeName.toUpperCase() + " *" + "/", selector + " {"];

    var themeTokens = result.tokens && result.tokens[themeName];
    if (!themeTokens) return lines.concat(["}"]).join("\n");

    var colorNames = Object.keys(themeTokens);
    for (var ci = 0; ci < colorNames.length; ci++) {
      var colorName = colorNames[ci];
      var cLabel = _colorLabel(colorName, config);
      lines.push("\n  /" + "* " + colorName + " *" + "/");
      var roles = themeTokens[colorName];
      var roleIds = Object.keys(roles);
      for (var ri = 0; ri < roleIds.length; ri++) {
        var roleId = roleIds[ri];
        var roleObj = (config.roles && config.roles[roleId]) || { name: roleId };
        var rLabel = _roleLabel(roleObj, config);
        var varDefs = _variationDefs(roleObj, config);
        var variations = roles[roleId];
        for (var vi = 0; vi < varDefs.length; vi++) {
          var token = variations[String(vi)];
          if (!token) continue;
          var vLabel = _varLabel(varDefs[vi], config);
          var segs = _tokenSegments(cLabel, rLabel, vLabel, config);
          lines.push("  --" + segs.map(_slug).join("-") + ": " + token.value + ";");
        }
      }
    }

    lines.push("}");

    // OS dark fallback
    if (themeName.toLowerCase() === "dark") {
      lines.push("\n@media (prefers-color-scheme: dark) {");
      lines.push("  :root:not([data-theme]) {");
      for (var ci2 = 0; ci2 < colorNames.length; ci2++) {
        var colorName2 = colorNames[ci2];
        var cLabel2 = _colorLabel(colorName2, config);
        var roles2 = themeTokens[colorName2];
        var roleIds2 = Object.keys(roles2);
        for (var ri2 = 0; ri2 < roleIds2.length; ri2++) {
          var roleId2 = roleIds2[ri2];
          var roleObj2 = (config.roles && config.roles[roleId2]) || { name: roleId2 };
          var rLabel2 = _roleLabel(roleObj2, config);
          var varDefs2 = _variationDefs(roleObj2, config);
          var variations2 = roles2[roleId2];
          for (var vi2 = 0; vi2 < varDefs2.length; vi2++) {
            var token2 = variations2[String(vi2)];
            if (!token2) continue;
            var vLabel2 = _varLabel(varDefs2[vi2], config);
            var segs2 = _tokenSegments(cLabel2, rLabel2, vLabel2, config);
            lines.push("    --" + segs2.map(_slug).join("-") + ": " + token2.value + ";");
          }
        }
      }
      lines.push("  }\n}");
    }

    return lines.join("\n");
  },
};
