/**
 * exportEng/helpers.js
 * Shared token-name resolution utilities used by all formatters.
 * Safe for both Figma sandbox (ES2019) and browser contexts.
 */

function _colorLabel(colorName, config) {
  if (!config.useShorthandColors) return colorName;
  for (var i = 0; i < config.colors.length; i++) {
    if (config.colors[i].name === colorName && config.colors[i].shorthand)
      return config.colors[i].shorthand;
  }
  return colorName;
}

function _roleLabel(roleObj, config) {
  if (!config.useShorthandRoles) return roleObj.name;
  return (roleObj && roleObj.shorthand) ? roleObj.shorthand : roleObj.name;
}

function _varLabel(varDef, config) {
  if (!config.useShorthandVariations) return varDef.name;
  return (varDef && varDef.shorthand) ? varDef.shorthand : varDef.name;
}

function _stepLabel(stepName, config) {
  if (!config.useShorthandSteps) return stepName;
  var sh = config.scaleStepShorthands && config.scaleStepShorthands[stepName];
  return sh ? sh : stepName;
}

function _tokenSegments(colorLabel, roleLabel, varLabel, config) {
  var order = config.tokenNameSegments || ["color", "role", "variation"];
  var parts = { color: colorLabel, role: roleLabel, variation: varLabel };
  var out = [];
  for (var i = 0; i < order.length; i++) {
    var p = parts[order[i]];
    if (p) out.push(p);
  }
  return out;
}

function _variationDefs(roleObj, config) {
  return (roleObj.customVariationList && roleObj.customVariations && roleObj.customVariations.length > 0)
    ? roleObj.customVariations
    : config.variations;
}

// kebab-case slug — same rules as docGen.cssSlug
function _slug(str) {
  if (!str) return "";
  return String(str).toLowerCase().trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// camelCase for Swift / RN identifiers
function _camel(parts) {
  return parts.map(function(p, i) {
    var s = _slug(p).replace(/-([a-z0-9])/g, function(_, c) { return c.toUpperCase(); });
    return i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
  }).join("");
}

// snake_case for Android XML resource names
function _snake(parts) {
  return parts.map(function(p) { return _slug(p).replace(/-/g, "_"); }).join("_");
}

// hex → {r,g,b} components 0-255
function _hexComponents(hex) {
  var h = hex.replace(/^#/, "");
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

// tokenRef "ColorName-Step" → last-dash split
function _splitTokenRef(ref) {
  var last = ref.lastIndexOf("-");
  return { color: ref.substring(0, last), step: ref.substring(last + 1) };
}

// Walk all tokens in all themes calling cb(theme, colorName, roleObj, varDef, token, colorLabel, roleLabel, varLabel, segments)
function _eachToken(result, config, cb) {
  var themeKeys = Object.keys(result.tokens || {});
  for (var ti = 0; ti < themeKeys.length; ti++) {
    var theme = themeKeys[ti];
    var themeTokens = result.tokens[theme];
    if (!themeTokens) continue;
    var colorNames = Object.keys(themeTokens);
    for (var ci = 0; ci < colorNames.length; ci++) {
      var colorName = colorNames[ci];
      var cLabel = _colorLabel(colorName, config);
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
          cb(theme, colorName, roleObj, varDefs[vi], token, cLabel, rLabel, vLabel, segs);
        }
      }
    }
  }
}
