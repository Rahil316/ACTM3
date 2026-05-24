/**
 * exportEng/fmtSCSS.js
 * SCSS — three files: scale.scss, tokens.scss, index.scss
 */

var fmtSCSS = {

  scale: function(result, config) {
    var lines = ["// " + (config.name || "tokens") + " — color scale variables", "// Do not edit manually.\n"];
    var scaleNames = Object.keys(result.scales || {});
    for (var ci = 0; ci < scaleNames.length; ci++) {
      var colorName = scaleNames[ci];
      var cLabel = _colorLabel(colorName, config);
      var scale = result.scales[colorName];
      lines.push("// " + colorName);
      var steps = Object.keys(scale);
      for (var si = 0; si < steps.length; si++) {
        var step = steps[si];
        var entry = scale[step];
        if (!entry || !entry.value) continue;
        lines.push("$" + _slug(cLabel) + "-" + _slug(_stepLabel(step, config)) + ": " + entry.value + ";");
      }
      // scale map
      lines.push("$scale-" + _slug(cLabel) + ": (");
      for (var si2 = 0; si2 < steps.length; si2++) {
        var step2 = steps[si2];
        var entry2 = result.scales[colorName][step2];
        if (!entry2 || !entry2.value) continue;
        lines.push("  " + _slug(_stepLabel(step2, config)) + ": $" + _slug(cLabel) + "-" + _slug(_stepLabel(step2, config)) + ",");
      }
      lines.push(");\n");
    }
    return lines.join("\n");
  },

  tokens: function(result, config) {
    var lines = ["// " + (config.name || "tokens") + " — semantic token maps", "@use 'sass:map';\n", "@forward 'scale';\n"];
    var themeKeys = Object.keys(result.tokens || {});
    for (var ti = 0; ti < themeKeys.length; ti++) {
      var theme = themeKeys[ti];
      var themeTokens = result.tokens[theme];
      if (!themeTokens) continue;
      lines.push("$tokens-" + _slug(theme) + ": (");
      var colorNames = Object.keys(themeTokens);
      for (var ci = 0; ci < colorNames.length; ci++) {
        var colorName = colorNames[ci];
        var cLabel = _colorLabel(colorName, config);
        lines.push("  // " + colorName);
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
            var key = segs.map(_slug).join("-");
            var ref;
            if (token.tokenRef) {
              var parts = _splitTokenRef(token.tokenRef);
              ref = "$" + _slug(parts.color) + "-" + _slug(parts.step);
            } else {
              ref = token.value;
            }
            var note = token.isAdjusted ? " /" + "* ⚠ adjusted *" + "/" : "";
            lines.push("  \"" + key + "\": " + ref + "," + note);
          }
        }
      }
      lines.push(");\n");
    }
    return lines.join("\n");
  },

  index: function(result, config) {
    var themeKeys = Object.keys(result.tokens || {});
    var lines = [
      "// " + (config.name || "tokens") + " — theme output",
      "@use 'sass:map';",
      "@use 'tokens' as *;\n",
      "/// Writes all token map entries as CSS custom properties.",
      "/// Usage: @include apply-theme($tokens-light);",
      "@mixin apply-theme($tokens) {",
      "  @each $name, $value in $tokens {",
      "    --#{$name}: #{$value};",
      "  }",
      "}\n",
      "// Class-based theming",
    ];
    for (var ti = 0; ti < themeKeys.length; ti++) {
      var theme = themeKeys[ti];
      var varName = "$tokens-" + _slug(theme);
      if (ti === 0) {
        lines.push(":root,\n[data-theme=\"" + theme + "\"] {\n  @include apply-theme(" + varName + ");\n}\n");
      } else {
        lines.push("[data-theme=\"" + theme + "\"] {\n  @include apply-theme(" + varName + ");\n}\n");
      }
    }
    var darkKey = null;
    for (var ti2 = 0; ti2 < themeKeys.length; ti2++) {
      if (themeKeys[ti2].toLowerCase() === "dark") { darkKey = themeKeys[ti2]; break; }
    }
    if (darkKey) {
      lines.push("// OS-level dark mode fallback");
      lines.push("@media (prefers-color-scheme: dark) {");
      lines.push("  :root:not([data-theme]) {");
      lines.push("    @include apply-theme($tokens-" + _slug(darkKey) + ");");
      lines.push("  }\n}");
    }
    return lines.join("\n");
  },
};
