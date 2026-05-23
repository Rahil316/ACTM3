/* color/clrUtils.js */
function validHex(hex) {
  if (typeof hex !== "string") return false;
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

function normalizeHex(hex) {
  if (!validHex(hex)) return null;
  hex = hex.trim().replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  return "#" + hex.toUpperCase();
}

function hexToRgb(hex) {
  const nhex = normalizeHex(hex);
  if (!nhex) return null;
  const bigint = parseInt(nhex.replace(/^#/, ""), 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHsl(r, g, b) {
  if ([r, g, b].some((v) => typeof v !== "number" || v < 0 || v > 255)) return null;
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb[0], rgb[1], rgb[2]) : null;
}

function hexToHue(hex) {
  const hsl = hexToHsl(hex);
  return hsl ? hsl[0] : null;
}
function hexToSat(hex) {
  const hsl = hexToHsl(hex);
  return hsl ? hsl[1] : null;
}
function hslToRgb(h, s, l) {
  if (typeof h !== "number" || typeof s !== "number" || typeof l !== "number" || h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r, g, b) {
  if ([r, g, b].some((v) => typeof v !== "number" || v < 0 || v > 255)) return null;
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function hslToHex(h, s, l) {
  const rgb = hslToRgb(h, s, l);
  return rgb ? rgbToHex(rgb[0], rgb[1], rgb[2]) : null;
}

function srgbLinearize(v) {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function srgbDelinearize(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

function relLum(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(srgbLinearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  const n1 = normalizeHex(hex1),
    n2 = normalizeHex(hex2);
  if (!n1 || !n2) return null;
  const l1 = relLum(n1),
    l2 = relLum(n2);
  if (l1 === null || l2 === null) return null;
  return Number(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2));
}

function shortestHueDiff(current, target) {
  return ((((target - current + 180) % 360) + 360) % 360) - 180;
}

function contrastRating(hex1, hex2) {
  const ratio = contrastRatio(hex1, hex2);
  if (ratio === null) return null;
  if (ratio < 3) return "Fail";
  if (ratio < 4.5) return "AA Large Text";
  if (ratio < 7) return "AA";
  return "AAA";
}

function seriesMaker(x) {
  const out = [];
  for (let i = 1; i <= x; i++) out.push(i);
  return out;
}

function sanitizeHex(val) {
  return (val || "")
    .replace(/[^0-9A-Fa-f]/g, "")
    .toUpperCase()
    .substring(0, 6);
}

/* color/clrEngine.js */
const SOLVER_MODES = ["natural", "saturated", "luminance", "hue-locked", "chroma-maximized"];
const OVERSHOOT_WARN = 0.3; // attach warning when achieved contrast overshoots target by this much
const MAX_ITER = 60; // binary search iterations when solving for L
const L_EPS = 1e-5; // convergence threshold for L binary search

const TONAL_SCALE_ALGO = {
  
  Linear: (hue, satu, N) => {
    const inc = 100 / (N + 1);
    const out = [];
    for (let i = 1; i <= N; i++) out.push(hslToHex(hue, satu, i * inc) || "#000000");
    return out.reverse();
  },

  
  Uniform: (hue, satu, N, stepLum, findL) => {
    const out = [];
    for (let i = 0; i < N; i++) {
      const L = findL(
        stepLum(i),
        () => satu,
        () => hue,
      );
      out.push(hslToHex(hue, satu, L) || "#000000");
    }
    return out;
  },

  
  Natural: (hue, satu, N, stepLum, findL) => {
    const tapS = (L) => satu * (1 - Math.pow(Math.abs(L - 50) / 50, 1.5) * 0.4);
    const out = [];
    for (let i = 0; i < N; i++) {
      const L = findL(stepLum(i), tapS, () => hue);
      out.push(hslToHex(hue, tapS(L), L) || "#000000");
    }
    return out;
  },

  
  Expressive: (hue, satu, N, stepLum, findL) => {
    const tapS = (L) => satu * (1 - Math.pow(Math.abs(L - 50) / 50, 1.5) * 0.4);
    const shiftH = (L) => {
      const d = (L - 50) / 50;
      return (hue + shortestHueDiff(hue, d > 0 ? 60 : 240) * Math.abs(d) * 0.15 + 360) % 360;
    };
    const out = [];
    for (let i = 0; i < N; i++) {
      const L = findL(stepLum(i), tapS, shiftH);
      out.push(hslToHex(shiftH(L), tapS(L), L) || "#000000");
    }
    return out;
  },

  
  Symmetric: (hue, satu, N, _stepLum, findL, { hexIn, uMax, uMin }) => {
    const srcLum = relLum(normalizeHex(hexIn)) || 0.18;
    const uSrc = Math.log(srcLum + 0.05); // log-luminance of source color
    const mid = Math.floor((N - 1) / 2);
    const out = [];
    for (let i = 0; i < N; i++) {
      let u;
      if (N === 1) u = uSrc;
      else if (i === 0) u = uMax;
      else if (i === N - 1) u = uMin;
      else if (i <= mid && mid > 0) u = uMax - ((uMax - uSrc) * i) / mid;
      else u = uSrc - ((uSrc - uMin) * (i - mid)) / (N - 1 - mid);
      const targetLum = Math.max(0.0001, Math.exp(Math.min(uMax, Math.max(uMin, u))) - 0.05);
      const L = findL(
        targetLum,
        () => satu,
        () => hue,
      );
      out.push(hslToHex(hue, satu, L) || "#000000");
    }
    return out;
  },

  
  OKLCH: (_hue, _satu, N, stepLum, _findL, { hexIn }) => {
    const { C: srcC, H: srcH } = hexToOklch(normalizeHex(hexIn));
    const out = [];
    for (let i = 0; i < N; i++) {
      const targetLum = stepLum(i);
      let lo = 0,
        hi = 1,
        oL = 0.5;
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2;
        const lum = relLum(oklchToHex(mid, srcC, srcH));
        oL = mid;
        if (Math.abs(lum - targetLum) < 0.0001) break;
        if (lum < targetLum) lo = mid;
        else hi = mid;
      }
      out.push(oklchToHex(oL, srcC, srcH) || "#000000");
    }
    return out;
  },

  
  Material: (_hue, _satu, N, stepLum, _findL, { hexIn }) => {
    const { h: srcH, c: srcC } = hexToHct(normalizeHex(hexIn));
    const out = [];
    for (let i = 0; i < N; i++) {
      const targetLum = stepLum(i);
      let lo = 0,
        hi = 100,
        tone = 50;
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2;
        const lum = relLum(hctToHex(srcH, srcC, mid));
        tone = mid;
        if (Math.abs(lum - targetLum) < 0.0001) break;
        if (lum < targetLum) lo = mid;
        else hi = mid;
      }
      out.push(hctToHex(srcH, srcC, tone) || "#000000");
    }
    return out;
  },
};

function scaleMaker(hexIn, scaleLength, scaleAlgo) {
  scaleAlgo = scaleAlgo || "Natural";
  const hue = hexToHue(hexIn);
  const satu = hexToSat(hexIn);
  if (hue === null || satu === null) {
    console.warn("scaleMaker: invalid hex input", hexIn, "— returning black scale");
    return Array(scaleLength).fill("#000000");
  }
  const N = scaleLength;

  const C_max = (21 * N) / (N + 1);
  const uMax = Math.log(0.05 * C_max);
  const uMin = Math.log(1.05 / C_max);

  
  const stepLum = (i) => {
    const u = N === 1 ? (uMax + uMin) / 2 : uMax - (i / (N - 1)) * (uMax - uMin);
    return Math.exp(u) - 0.05;
  };

  
  const findL = (targetLum, getS, getH) => {
    let lo = 0,
      hi = 100,
      L = 50;
    for (let j = 0; j < 30; j++) {
      const mid = (lo + hi) / 2;
      const lum = relLum(hslToHex(getH(mid), getS(mid), mid));
      L = mid;
      if (Math.abs(lum - targetLum) < 0.0001) break;
      if (lum < targetLum) lo = mid;
      else hi = mid;
    }
    return L;
  };

  const strategy = TONAL_SCALE_ALGO[scaleAlgo] || TONAL_SCALE_ALGO.Natural;
  return strategy(hue, satu, N, stepLum, findL, { hexIn, uMax, uMin });
}

function variableMaker(config) {
  const { colors, themes, scaleLength } = config;
  const errors = { critical: [], warnings: [], notices: [] };

  const scales = config.pluginMode !== "direct" ? _generateScales(colors, scaleLength, config.scaleAlgorithm, config.scaleStepNames, themes, config.useUniformAlgorithm) : Object.create(null);

  const tokens = {};
  for (const mode of themes) tokens[mode.name.toLowerCase()] = {};
  for (const mode of themes) {
    const modeName = mode.name.toLowerCase();
    const themeTokens = tokens[modeName];
    for (const color of colors) {
      themeTokens[color.name] = {};
      if (config.pluginMode === "direct") {
        _solveDirectMode(color, mode, config, themeTokens[color.name], errors);
      } else {
        _processScaleMode(color, mode, config, scales, themeTokens[color.name], errors);
      }
    }
  }
  return { scales, tokens, errors };
}

function _generateScales(colors, scaleLength, scaleAlgo, stepNames, themes, useUniformAlgorithm) {
  const collection = Object.create(null);
  const names = stepNames || seriesMaker(scaleLength);
  const themeBgs = themes.map((t) => ({ key: t.name.toLowerCase(), bg: normalizeHex(t.bg) || "#FFFFFF" }));
  for (const color of colors) {
    const colorAlgo = (!useUniformAlgorithm && color.scaleAlgorithm) ? color.scaleAlgorithm : scaleAlgo;
    const scaleData = scaleMaker(color.value, scaleLength, colorAlgo);
    const scale = Object.create(null);
    collection[color.name] = scale;
    for (let i = 0; i < scaleLength; i++) {
      const value = normalizeHex(scaleData[i]) || "#000000";
      const step = names[i];
      const contrast = {};
      for (const { key, bg } of themeBgs) {
        contrast[key] = { ratio: contrastRatio(value, bg), rating: contrastRating(value, bg) };
      }
      scale[step] = {
        value,
        stepName: `${color.name}-${step}`,
        shorthand: `${color.shorthand}-${step}`,
        description: color.description || "",
        contrast,
      };
    }
  }
  return collection;
}

function _getSolverMode(config, color, role) {
  if (config.useUniformAlgorithm !== false) return config.solverMode || "natural";
  if (config.algorithmScopeLevel === "role") return (role && role.solverMode) || config.solverMode || "natural";
  return color.solverMode || config.solverMode || "natural";
}

function _solveDirectMode(color, mode, config, groupOutput, errors) {
  const modeName = mode.name.toLowerCase();
  const bgHex = mode.bg;

  for (let ri = 0; ri < config.roles.length; ri++) {
    const role = config.roles[ri];
    const roleOutput = (groupOutput[ri] = {});
    const solverMode = _getSolverMode(config, color, role);
    const variations = role.customVariationList && role.customVariations && role.customVariations.length ? role.customVariations : config.variations;
    const targets = role.variationTargets || variations.map((_, i) => [1.5, 3, 4.5, 7, 12][i] || 1.5 + i * 1.5);

    targets.forEach((targetContrast, vi) => {
      const variation = String(vi);
      const solved = solveColorForContrast(color.value, targetContrast, bgHex, solverMode);
      if (solved.warning) errors.warnings.push({ color: color.name, role: role.name, variation, theme: modeName, warning: solved.warning });
      if (solved.chromaReduced) errors.notices.push({ color: color.name, role: role.name, variation, theme: modeName, notice: "Chroma reduced to fit gamut." });
      roleOutput[variation] = {
        tokenName: `${color.name}-${role.name}-${variation}`,
        color: color.name,
        role: role.name,
        variation,
        roleDescription: role.description || "",
        tokenRef: null,
        value: solved.hex,
        contrast: { ratio: solved.achievedContrast, rating: contrastRating(solved.hex, bgHex) },
        contrastTarget: targetContrast,
        isAdjusted: solved.clipped || solved.achievedContrast > targetContrast + 0.3,
      };
    });
  }
}

function _processScaleMode(color, mode, config, scales, groupOutput, errors) {
  const modeName = mode.name.toLowerCase();
  const isDark = relLum(normalizeHex(mode.bg) || "#FFFFFF") < 0.4;
  const scale = scales[color.name];
  const stepNames = config.scaleStepNames || seriesMaker(config.scaleLength);

  for (let ri = 0; ri < config.roles.length; ri++) {
    const role = config.roles[ri];
    const roleOutput = (groupOutput[ri] = {});
    const variations = role.customVariationList && role.customVariations && role.customVariations.length ? role.customVariations : config.variations;

    if (role.mappingMethod === "index") {
      _mapByIndex(color, role, variations, scale, stepNames, modeName, roleOutput);
    } else {
      _mapByScaleContrast(color, role, variations, scale, stepNames, modeName, isDark, roleOutput, errors);
    }
  }
}

function _mapByIndex(color, role, variations, scale, stepNames, modeName, output) {
  const targets = role.variationTargets || variations.map((_, i) => Math.floor((stepNames.length * i) / Math.max(1, variations.length - 1)));
  variations.forEach((_, vi) => {
    const idx = Math.max(0, Math.min(stepNames.length - 1, parseInt(targets[vi], 10) || 0));
    const data = scale[stepNames[idx]];
    output[vi] = {
      tokenName: `${color.name}-${role.name}-${vi}`,
      color: color.name,
      role: role.name,
      variation: String(vi),
      roleDescription: role.description || "",
      tokenRef: data.stepName,
      value: data.value,
      contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
    };
  });
}

function _mapByScaleContrast(color, role, variations, scale, stepNames, modeName, isDark, output, errors) {
  variations.forEach((_, vi) => {
    const target = parseFloat(role.variationTargets && role.variationTargets[vi]) || 4.5;
    let bestIdx = isDark ? stepNames.length - 1 : 0;
    let found = false;
    if (isDark) {
      for (let i = stepNames.length - 1; i >= 0; i--) {
        if (scale[stepNames[i]].contrast[modeName].ratio >= target) { bestIdx = i; found = true; break; }
      }
    } else {
      for (let i = 0; i < stepNames.length; i++) {
        if (scale[stepNames[i]].contrast[modeName].ratio >= target) { bestIdx = i; found = true; break; }
      }
    }
    if (!found) {
      let maxC = -1;
      stepNames.forEach((n, i) => {
        const c = scale[n].contrast[modeName].ratio;
        if (c > maxC) { maxC = c; bestIdx = i; }
      });
      errors.warnings.push({ color: color.name, role: role.name, variation: String(vi), theme: modeName, warning: `Target contrast ${target} not achievable. Using closest (${maxC.toFixed(2)}).` });
    }
    const data = scale[stepNames[bestIdx]];
    output[vi] = {
      tokenName: `${color.name}-${role.name}-${vi}`,
      color: color.name,
      role: role.name,
      variation: String(vi),
      roleDescription: role.description || "",
      tokenRef: data.stepName,
      value: data.value,
      contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
      contrastTarget: target,
      isAdjusted: !found,
    };
  });
}

function _h2lr(hex) {
  const n = parseInt((normalizeHex(hex) || "#000000").replace("#", ""), 16);
  return [srgbLinearize((n >> 16) & 255), srgbLinearize((n >> 8) & 255), srgbLinearize(n & 255)];
}

function _lr2h(r, g, b) {
  const cl = (v) => srgbDelinearize(Math.max(0, v));
  return "#" + [cl(r), cl(g), cl(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function _m3(m, v) {
  return [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
}

const _M1 = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];
const _M1i = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
];

const _M2 = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];
const _M2i = [
  [1.0, 0.3963377774, 0.2158037573],
  [1.0, -0.1055613458, -0.0638541728],
  [1.0, -0.0894841775, -1.291485548],
];

function hexToOklch(hex) {
  const [r, g, b] = _h2lr(hex);
  const lms = _m3(_M1, [r, g, b]).map((v) => Math.cbrt(Math.max(0, v)));
  const [L, a, b2] = _m3(_M2, lms);
  return { L, C: Math.sqrt(a * a + b2 * b2), H: ((Math.atan2(b2, a) * 180) / Math.PI + 360) % 360 };
}

function oklchToHex(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const [r, g, bl] = _m3(
    _M1i,
    _m3(_M2i, [L, a, b]).map((v) => v * v * v),
  );
  return _lr2h(r, g, bl);
}

const _LX = [
  [0.4123907993, 0.3575843394, 0.1804807884],
  [0.2126390059, 0.7151686788, 0.0721923154],
  [0.0193308187, 0.1191947798, 0.9505321522],
];
const _XL = [
  [3.2409699419, -1.5373831776, -0.4986107603],
  [-0.9692436363, 1.8759675015, 0.0415550574],
  [0.0556300797, -0.2039769589, 1.0569715142],
];

const _VC = (() => {
  const W = [95.047, 100, 108.883]; // D65 white point (XYZ)
  const aL = (200 / Math.PI) * Math.pow(66 / 116, 3);
  const F = 1,
    c = 0.69,
    Nc = 1; // average surround
  const k = 1 / (5 * aL + 1);
  const FL = 0.2 * k ** 4 * (5 * aL) + 0.1 * (1 - k ** 4) ** 2 * (5 * aL) ** (1 / 3);
  const n = Math.pow(66 / 116, 3);
  const z = 1.48 + Math.sqrt(50 * n),
    Nbb = 0.725 / n ** 0.2,
    Ncb = Nbb;
  const hpe = [
    [0.38971, 0.68898, -0.07868],
    [-0.22981, 1.1834, 0.04641],
    [0, 0, 1],
  ];
  const cat = [
    [0.7328, 0.4296, -0.1624],
    [-0.7036, 1.6975, 0.0061],
    [0.003, 0.0136, 0.9834],
  ];
  const ci = [
    [1.0961238208, -0.2788690002, 0.1827452039],
    [0.4543690419, 0.4735331543, 0.0720978039],
    [-0.0096276087, -0.0056980312, 1.0153256399],
  ];
  const hpi = [
    [1.9101968341, -1.1121238928, 0.2019079568],
    [0.3709500882, 0.6290542574, -0.0000080551],
    [0, 0, 1],
  ];
  const m3 = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
  const D = F * (1 - (1 / 3.6) * Math.exp((-aL - 42) / 92));
  const rW = m3(
    cat,
    W.map((v) => v / 100),
  );
  const Drgb = rW.map((v) => D / v + 1 - D);
  const ad = (c2) => {
    const f = (FL * Math.abs(c2)) ** 0.42;
    return (400 * Math.sign(c2) * f) / (f + 27.13);
  };
  const aW = m3(
    hpe,
    m3(
      ci,
      rW.map((v, i) => v * Drgb[i]),
    ),
  ).map(ad);
  return { F, c, Nc, Nbb, Ncb, FL, n, z, Aw: (2 * aW[0] + aW[1] + 0.05 * aW[2] - 0.305) * Nbb, D, Drgb, hpe, cat, ci, hpi, ad };
})();

function _x2hct(X, Y, Z) {
  const v = _VC;
  const m3 = (m, v2) => [m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2], m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2], m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2]];
  const rgb = m3(v.cat, [X, Y, Z]).map((c2, i) => c2 * v.Drgb[i]);
  const rA = m3(v.hpe, m3(v.ci, rgb)).map(v.ad);
  const p2 = (2 * rA[0] + rA[1] + 0.05 * rA[2] - 0.305) * v.Nbb;
  const a = rA[0] - (12 * rA[1]) / 11 + rA[2] / 11;
  const b = (rA[0] + rA[1] - 2 * rA[2]) / 9;
  const hd = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const t = ((50000 / 13) * v.Nc * v.Ncb * Math.sqrt(a * a + b * b)) / (p2 + 0.305);
  const J = 100 * Math.pow(p2 / v.Aw, v.c * v.z);
  return { h: hd, c: Math.pow(t === 0 ? 0 : Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, v.n), 0.73), 1) * Math.sqrt(J / 100), t: Y <= 0 ? 0 : Y >= 1 ? 100 : 116 * Math.cbrt(Y) - 16 };
}

function hexToHct(hex) {
  const [r, g, b] = _h2lr(hex);
  return _x2hct(..._m3(_LX, [r, g, b]));
}

function _jFromTone(tone) {
  const v = _VC;
  const m3 = (m, v2) => [m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2], m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2], m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2]];
  if (tone <= 0) return 0;
  if (tone >= 100) return 100;
  const Y = tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3;
  const cat = m3(v.cat, [Y * 0.95047, Y, Y * 1.08883]).map((c2, i) => c2 * v.Drgb[i]);
  const hR = m3(v.hpe, m3(v.ci, cat)).map(v.ad);
  return 100 * Math.pow(Math.max(0, ((2 * hR[0] + hR[1] + 0.05 * hR[2] - 0.305) * v.Nbb) / v.Aw), v.c * v.z);
}

function _hctRgbOrNull(hue, ch, J) {
  const v = _VC;
  const m3 = (m, v2) => [m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2], m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2], m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2]];
  if (J <= 0) return null;
  const ta = ch > 0 ? Math.pow(ch / Math.sqrt(J / 100), 1 / 0.9) / Math.pow(1.64 - Math.pow(0.29, v.n), 0.73) : 0;
  const hr = (hue * Math.PI) / 180;
  const p1 = (50000 / 13) * v.Nc * v.Ncb;
  const p2 = (Math.pow(J / 100, 1 / (v.c * v.z)) * v.Aw) / v.Nbb + 0.305;
  let a = 0,
    b = 0;
  if (ta > 0) {
    const g = (23 * (p2 + 0.305) * ta) / (23 * p1 + 11 * ta * Math.cos(hr) + 108 * ta * Math.sin(hr));
    a = g * Math.cos(hr);
    b = g * Math.sin(hr);
  }
  const iv = (c2) => {
    const s = Math.sign(c2);
    return (s * Math.pow(Math.max(0, (Math.abs(c2) * 27.13) / (400 - Math.abs(c2))), 1 / 0.42)) / v.FL;
  };
  const Ra = (460 * p2 + 451 * a + 288 * b) / 1403;
  const Ga = (460 * p2 - 891 * a - 261 * b) / 1403;
  const Ba = (460 * p2 - 220 * a - 6300 * b) / 1403;
  const lr = m3(
    _XL,
    m3(
      v.ci,
      m3(v.hpi, [Ra, Ga, Ba].map(iv)).map((c2, i) => c2 / v.Drgb[i]),
    ),
  );
  if (Math.max(lr[0], lr[1], lr[2]) > 1 + 1e-4 || Math.min(lr[0], lr[1], lr[2]) < -1e-4) return null;
  return lr.map((x) => Math.max(0, x));
}

function hctToHex(hue, ch, tone) {
  if (ch < 0.0001 || tone <= 0 || tone >= 100) {
    if (tone <= 0) return "#000000";
    if (tone >= 100) return "#ffffff";
    const v = srgbDelinearize(tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3);
    return "#" + v.toString(16).padStart(2, "0").repeat(3);
  }
  const J = _jFromTone(tone);
  if (J <= 0) return "#000000";
  let lo = 0,
    hi = ch,
    best = null;
  for (let it = 0; it < 50; it++) {
    if (hi - lo < 0.01) break;
    const mid = (lo + hi) / 2;
    const rgb = _hctRgbOrNull(hue, mid, J);
    if (rgb === null) {
      hi = mid;
    } else {
      best = _lr2h(rgb[0], rgb[1], rgb[2]);
      lo = mid;
    }
  }
  return (
    best ||
    "#" +
      srgbDelinearize(tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3)
        .toString(16)
        .padStart(2, "0")
        .repeat(3)
  );
}

function _relLumFromLinear(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function _wcagContrast(lum1, lum2) {
  const hi = Math.max(lum1, lum2),
    lo = Math.min(lum1, lum2);
  return (hi + 0.05) / (lo + 0.05);
}

function _lumOfHex(hex) {
  const [r, g, b] = _h2lr(hex);
  return _relLumFromLinear(r, g, b);
}

function _inGamutOklch(L, C, H) {
  if (L <= 0 || L >= 1) return false;
  return hexToOklch(oklchToHex(L, C, H)).C >= C - 0.002;
}

function _maxChromaAtLH(L, H, startC) {
  if (startC <= 0.001) return 0;
  let lo = 0,
    hi = startC;
  for (let i = 0; i < 40; i++) {
    if (hi - lo < 0.0005) break;
    const mid = (lo + hi) / 2;
    if (_inGamutOklch(L, mid, H)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function _targetChroma(L, srcL, srcC, _srcH, mode) {
  if (srcC < 0.001) return 0; // achromatic source always stays achromatic
  switch (mode) {
    case "saturated":
      return srcC; // hold source C, only move L
    case "luminance":
      return srcC * (1 - Math.pow(Math.abs(2 * L - 1), 1.5)); // parabolic drop at extremes
    case "natural":
      return (srcC / Math.max(srcL, 1 - srcL)) * Math.min(L, 1 - L); // linear through srcC at srcL
    default:
      return srcC;
  }
}

function _searchL(bgLum, targetContrast, lo, hi, getHexAtL) {
  let bestL = null;
  let failedConversions = 0;
  for (let i = 0; i < MAX_ITER; i++) {
    if (hi - lo < L_EPS) break;
    const mid = (lo + hi) / 2;
    const hex = getHexAtL(mid);
    if (!hex) {
      if (++failedConversions > 8) { console.warn("_searchL: too many failed hex conversions, aborting search"); break; }
      lo = mid;
      continue;
    }
    const contrast = _wcagContrast(_lumOfHex(hex), bgLum);
    if (contrast >= targetContrast) {
      bestL = mid;

      if (bgLum > 0.5) lo = mid;
      else hi = mid;
    } else {
      if (bgLum > 0.5) hi = mid;
      else lo = mid;
    }
  }
  return bestL;
}

function solveColorForContrast(sourceHex, targetContrast, bgHex, solverMode) {
  solverMode = SOLVER_MODES.includes(solverMode) ? solverMode : "natural";
  const src = hexToOklch(sourceHex);
  const bgLum = _lumOfHex(bgHex);
  const bgIsLight = bgLum > 0.18; // equal-contrast point: sqrt(0.05 * 1.05) - 0.05 ≈ 0.179 — luminance where contrast to black equals contrast to white

  const maxTheoreticalContrast = _wcagContrast(bgLum, bgIsLight ? 0 : 1);
  if (targetContrast > maxTheoreticalContrast + 0.01) {
    const fallback = bgIsLight ? "#000000" : "#FFFFFF";
    return { hex: fallback, achievedContrast: parseFloat(maxTheoreticalContrast.toFixed(2)), solverMode, chromaReduced: true, clipped: true, warning: `Target contrast ${targetContrast} is unreachable against this background (max ${maxTheoreticalContrast.toFixed(2)}). Black/white used.` };
  }

  const lLow = 0.001,
    lHigh = 0.999;
  let solvedL = null,
    solvedC = null,
    chromaReduced = false;

  if (solverMode === "chroma-maximized") {

    const getHex = (L) => {
      const maxC = _maxChromaAtLH(L, src.H, Math.max(src.C, 0.2));
      return oklchToHex(L, maxC < 0.001 ? 0 : maxC, src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) solvedC = _maxChromaAtLH(solvedL, src.H, Math.max(src.C, 0.2));
  } else if (solverMode === "hue-locked") {

    const getHex = (L) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, "natural");
      return oklchToHex(L, _maxChromaAtLH(L, src.H, rawC), src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, "natural");
      solvedC = _maxChromaAtLH(solvedL, src.H, rawC);
      if (solvedC < src.C - 0.01) chromaReduced = true;
    }
  } else {

    const getHex = (L) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, solverMode);
      return oklchToHex(L, _maxChromaAtLH(L, src.H, rawC), src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, solverMode);
      solvedC = _maxChromaAtLH(solvedL, src.H, rawC);
      if (rawC > 0.001 && solvedC < rawC - 0.01) chromaReduced = true;
    }
  }

  if (solvedL === null) {

    const fallback = bgIsLight ? "#000000" : "#FFFFFF";
    return { hex: fallback, achievedContrast: parseFloat(_wcagContrast(_lumOfHex(fallback), bgLum).toFixed(2)), solverMode, chromaReduced: true, clipped: true, warning: `Solver could not find a solution for target contrast ${targetContrast}. Black/white used.` };
  }

  const resultHex = oklchToHex(solvedL, solvedC || 0, src.H);
  const achievedContrast = parseFloat(_wcagContrast(_lumOfHex(resultHex), bgLum).toFixed(2));
  let warning = null;
  if (achievedContrast < targetContrast) warning = `Achieved contrast ${achievedContrast} is below target ${targetContrast}. Possible floating-point edge case.`;
  else if (achievedContrast > targetContrast + OVERSHOOT_WARN) warning = `Target ${targetContrast} not achievable precisely; nearest is ${achievedContrast} (overshoot ${(achievedContrast - targetContrast).toFixed(2)}).`;

  return { hex: resultHex, achievedContrast, solverMode, chromaReduced, clipped: false, warning };
}

function validateVariationContrasts(targets) {
  const errors = [];
  for (let i = 1; i < targets.length; i++) {
    if (targets[i] <= targets[i - 1]) errors.push(`Variation ${i + 1} (${targets[i]}) must be greater than variation ${i} (${targets[i - 1]}).`);
  }
  return { valid: errors.length === 0, errors };
}

/* shared/docGen.js */
function cssSlug(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function csvField(val) {
  const s = String(val !== undefined && val !== null ? val : "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

const ExportFormatter = {

  toCSV(result, config) {
    const lines = [];

    lines.push("COLOR SCALES");
    const scaleEntries = Object.values(result.scales || {});
    const firstStep = scaleEntries.length ? Object.values(scaleEntries[0])[0] : null;
    const contrastKeys = firstStep ? Object.keys(firstStep.contrast || {}) : [];
    const scaleHeader = ["Group", "Step", "Hex", ...contrastKeys.flatMap(k => [k + " Contrast", k + " Rating"])].join(",");
    lines.push(scaleHeader);
    for (const [colorName, scale] of Object.entries(result.scales || {})) {
      for (const [step, entry] of Object.entries(scale)) {
        const contrastCols = contrastKeys.flatMap(k => [
          csvField(entry.contrast && entry.contrast[k] ? entry.contrast[k].ratio : ""),
          csvField(entry.contrast && entry.contrast[k] ? entry.contrast[k].rating : ""),
        ]);
        lines.push([csvField(colorName), csvField(step), csvField(entry.value), ...contrastCols].join(","));
      }
    }

    lines.push("");
    lines.push("ROLE TOKENS");
    lines.push("Color,Role,Variation,Theme,Hex,Contrast,Rating,Adjusted");
    for (const theme of Object.keys(result.tokens || {})) {
      if (!result.tokens[theme]) continue;
      for (const [colorName, roles] of Object.entries(result.tokens[theme])) {
        for (const [roleId, variations] of Object.entries(roles)) {
          const roleObj = config.roles[roleId] || {};
          const roleName = roleObj.name || roleId;
          const variationDefs = roleObj.customVariationList && roleObj.customVariations && roleObj.customVariations.length > 0
            ? roleObj.customVariations
            : config.variations;
          for (let i = 0; i < variationDefs.length; i++) {
            const token = variations[String(i)];
            if (!token) continue;
            const dispName = variationDefs[i].shorthand || variationDefs[i].name;
            lines.push([csvField(colorName), csvField(roleName), csvField(dispName), csvField(theme), csvField(token.value), csvField(token.contrast ? token.contrast.ratio : ""), csvField(token.contrast ? token.contrast.rating : ""), csvField(token.isAdjusted ? "yes" : "")].join(","));
          }
        }
      }
    }

    return lines.join("\n");
  },

  toCSS(result, config) {
    const date = new Date().toISOString();
    let css = `\n\n`;

    css += `:root {\n  \n`;
    for (const [colorName, scale] of Object.entries(result.scales)) {
      css += `\n  \n`;
      for (const [step, entry] of Object.entries(scale)) {
        css += `  --${cssSlug(colorName)}-${cssSlug(String(step))}: ${entry.value};\n`;
      }
    }
    css += `}\n`;

    const themeKeys = Object.keys(result.tokens || {});
    for (let ti = 0; ti < themeKeys.length; ti++) {
      const theme = themeKeys[ti];
      if (!result.tokens[theme]) continue;
      const selector = ti === 0 ? `:root,\n[data-theme="${theme}"]` : `[data-theme="${theme}"]`;
      css += `\n\n${selector} {\n`;
      for (const [colorName, roles] of Object.entries(result.tokens[theme])) {
        css += `\n  \n`;
        for (const [roleId, variations] of Object.entries(roles)) {
          const roleObj = config.roles[roleId] || {};
          const roleName = roleObj.name || roleId;
          const variationDefs = roleObj.customVariationList && roleObj.customVariations && roleObj.customVariations.length > 0
            ? roleObj.customVariations
            : config.variations;
          for (let i = 0; i < variationDefs.length; i++) {
            const token = variations[String(i)];
            if (!token) continue;
            const dispName = variationDefs[i].shorthand || variationDefs[i].name;
            css += `  --${cssSlug(colorName)}-${cssSlug(roleName)}-${cssSlug(dispName)}: ${token.value};\n`;
          }
        }
      }
      css += `}\n`;
    }

    const darkThemeKey = themeKeys.find((k) => k.toLowerCase() === "dark");
    if (darkThemeKey) {
      css += `\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n`;
      for (const [colorName, roles] of Object.entries(result.tokens[darkThemeKey])) {
        for (const [roleId, variations] of Object.entries(roles)) {
          const roleObj = config.roles[roleId] || {};
          const roleName = roleObj.name || roleId;
          const variationDefs = roleObj.customVariationList && roleObj.customVariations && roleObj.customVariations.length > 0
            ? roleObj.customVariations
            : config.variations;
          for (let i = 0; i < variationDefs.length; i++) {
            const token = variations[String(i)];
            if (!token) continue;
            const dispName = variationDefs[i].shorthand || variationDefs[i].name;
            css += `    --${cssSlug(colorName)}-${cssSlug(roleName)}-${cssSlug(dispName)}: ${token.value};\n`;
          }
        }
      }
      css += `  }\n}\n`;
    }

    return css;
  },
};

function scssSlug(str) {
  return cssSlug(str); // reuse the same sanitiser
}

function generateScss(result, config) {
  if (!result || !result.scales) return "";
  const configVariations = (config && config.variations) || [];
  const systemName = (config && config.name) || "tokens";
  const date = new Date().toISOString();

  const hr = (title) => `// ${"=".repeat(58)}\n// ${title}\n// ${"=".repeat(58)}\n\n`;

  let scss = `// ${systemName} — Auto-generated SCSS\n// Generated: ${date}\n// Do not edit manually.\n\n`;
  scss += `@use 'sass:map';\n\n`;

  scss += hr("COLOR SCALE VARIABLES");
  for (const [group, steps] of Object.entries(result.scales)) {
    scss += `// ${group}\n`;
    for (const [step, data] of Object.entries(steps)) {
      if (!data || !data.value) continue;
      scss += `$${scssSlug(group)}-${scssSlug(String(step))}: ${data.value};\n`;
    }
    scss += "\n";
  }

  scss += hr("PER-COLOR SCALE MAPS");
  for (const [group, steps] of Object.entries(result.scales)) {
    scss += `$scale-${scssSlug(group)}: (\n`;
    for (const [step, data] of Object.entries(steps)) {
      if (!data || !data.value) continue;
      scss += `  ${scssSlug(String(step))}: $${scssSlug(group)}-${scssSlug(String(step))},\n`;
    }
    scss += `);\n\n`;
  }

  const scssThemeKeys = Object.keys(result.tokens || {});
  for (const theme of scssThemeKeys) {
    if (!result.tokens[theme]) continue;
    scss += hr(`${theme.toUpperCase()} THEME TOKENS`);
    scss += `$tokens-${scssSlug(theme)}: (\n`;
    for (const [colorName, roles] of Object.entries(result.tokens[theme])) {
      scss += `  // ${colorName}\n`;
      for (const [roleId, variations] of Object.entries(roles)) {
        const roleObj = (config && config.roles[roleId]) || {};
        const roleName = roleObj.name || roleId;
        const variationDefs = roleObj.customVariationList && roleObj.customVariations && roleObj.customVariations.length > 0
          ? roleObj.customVariations
          : configVariations;
        for (let i = 0; i < variationDefs.length; i++) {
          const token = variations[String(i)];
          if (!token) continue;
          const dispName = variationDefs[i].shorthand || variationDefs[i].name;
          const tokenKey = `${scssSlug(colorName)}-${scssSlug(roleName)}-${scssSlug(dispName)}`;
          let scaleRef;
          if (token.tokenRef) {

            const lastDash = token.tokenRef.lastIndexOf("-");
            scaleRef = `$${scssSlug(token.tokenRef.substring(0, lastDash))}-${scssSlug(token.tokenRef.substring(lastDash + 1))}`;
          } else {
            scaleRef = token.value;
          }
          const adjusted = token.isAdjusted ? " " : "";
          scss += `  "${tokenKey}": ${scaleRef},${adjusted}\n`;
        }
      }
    }
    scss += `);\n\n`;
  }

  scss += hr("THEME MIXIN");
  scss += `/// Writes all token map entries as CSS custom properties.\n`;
  scss += `/// Usage: @include apply-theme($tokens-light);\n`;
  scss += `@mixin apply-theme($tokens) {\n`;
  scss += `  @each $name, $value in $tokens {\n`;
  scss += `    --#{$name}: #{$value};\n`;
  scss += `  }\n`;
  scss += `}\n\n`;

  scss += hr("THEME OUTPUT");
  scss += `// Class-based theming\n`;
  for (let ti = 0; ti < scssThemeKeys.length; ti++) {
    const theme = scssThemeKeys[ti];
    const varName = `$tokens-${scssSlug(theme)}`;
    if (ti === 0) {
      scss += `:root,\n[data-theme="${theme}"] {\n  @include apply-theme(${varName});\n}\n\n`;
    } else {
      scss += `[data-theme="${theme}"] {\n  @include apply-theme(${varName});\n}\n\n`;
    }
  }
  const scssDarkKey = scssThemeKeys.find((k) => k.toLowerCase() === "dark");
  if (scssDarkKey) {
    scss += `// OS-level dark mode fallback\n`;
    scss += `@media (prefers-color-scheme: dark) {\n`;
    scss += `  :root:not([data-theme]) {\n`;
    scss += `    @include apply-theme($tokens-${scssSlug(scssDarkKey)});\n`;
    scss += `  }\n`;
    scss += `}\n`;
  }

  return scss;
}

/* shared/config.js */
const _FALLBACK_VARS = [1.5, 3.0, 4.5, 7.0, 12.0];
const _getVariationTargets = () => typeof DEFAULT_VARIATION_TARGETS !== "undefined" ? DEFAULT_VARIATION_TARGETS : _FALLBACK_VARS; // eslint-disable-line no-undef

function translateConfig(appState) {
  const count = Math.max(1, parseInt(appState.scaleLength) || 23);
  const stepNames = _parseStepNames(appState, count);
  const stepShorthands = _parseStepShorthands(appState, stepNames);
  const variations = _parseVariations(appState);
  const roleStepNames = variations.map((v) => (appState.useShorthandVariations && v.shorthand ? v.shorthand : v.name));
  const themes = appState.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];

  return {
    name: appState.name || "token-wand",
    colors: (appState.colors || []).map((g) => ({
      name: g.name,
      shorthand: g.shorthand,
      value: g.value,
      solverMode: g.solverMode || "natural",
      scaleAlgorithm: g.scaleAlgorithm || null, // null = fall back to global
      description: g.description || "",
    })),
    roles: _mapRoles(appState, variations),
    scaleLength: count,
    scaleAlgorithm: appState.scaleAlgorithm || "Natural",
    pluginMode: appState.pluginMode || "scale",
    scaleStepNames: stepNames,
    roleStepNames,
    variations: variations.map(function (v) {
      return Object.assign({}, v);
    }),
    themes: _deduplicateThemeNames(themes),
    resolveTokensDirectly: appState.resolveTokensDirectly || false,
    tokenGrouping: appState.tokenGrouping || "color",
    tokenNameSegments: appState.tokenNameSegments || ["color", "role", "variation"],
    useShorthandColors: appState.useShorthandColors || false,
    useShorthandRoles: appState.useShorthandRoles || false,
    useShorthandVariations: appState.useShorthandVariations || false,
    useShorthandSteps: appState.useShorthandSteps || false,
    scaleStepShorthands: stepShorthands,
    includeSourceColors: appState.includeSourceColors || false,
    sourceCollectionName: appState.sourceCollectionName || "_constants",
    scaleCollectionName: appState.scaleCollectionName || "_scale",
    tokenCollectionName: appState.tokenCollectionName || "color tokens",
    includeAlphaTints: appState.includeAlphaTints || false,
    alphaValues: (appState.alphaValues || "10, 25, 50, 75, 90")
      .split(",")
      .map((v) => Math.max(0, Math.min(100, parseInt(v.trim()))))
      .filter((v) => !isNaN(v)),
    includeDescriptions: appState.includeDescriptions !== false,
    includeColorScalesCollection: appState.includeColorScalesCollection !== false,
    useUniformAlgorithm: appState.useUniformAlgorithm !== false,
    algorithmScopeLevel: appState.algorithmScopeLevel || "color",
    solverMode: appState.solverMode || "natural",
  };
}

function _parseStepNames(appState, count) {
  const items = Array.isArray(appState.scaleStepNames) ? appState.scaleStepNames : [];

  const userNames = items.length > 0 ? items.map((s) => (typeof s === "string" ? s : s.name || "")) : null;
  if (!userNames || userNames.length === 0) return null;

  const names = userNames.slice();
  while (names.length < count) names.push(String(names.length + 1));
  return names.slice(0, count);
}

function _parseStepShorthands(appState, resolvedNames) {
  if (!resolvedNames) return {};
  const items = Array.isArray(appState.scaleStepNames) ? appState.scaleStepNames : [];
  const map = {};
  items.forEach((item, i) => {
    if (typeof item === "object" && item.shorthand && item.shorthand !== item.name) {
      const key = resolvedNames[i];
      if (key) map[key] = item.shorthand;
    }
  });
  return map;
}

function _deduplicateThemeNames(themes) {
  const seen = {};
  return (themes || [{ name: "Light", bg: "FFFFFF" }, { name: "Dark", bg: "000000" }]).map((t) => {
    const base = (t.name || "Theme").trim();
    if (!seen[base]) { seen[base] = 1; return { name: base, bg: t.bg || "FFFFFF" }; }
    seen[base]++;
    return { name: `${base} ${seen[base]}`, bg: t.bg || "FFFFFF" };
  });
}

function _parseVariations(appState) {
  return appState.variations && appState.variations.length > 0 ? appState.variations : [1, 2, 3, 4, 5].map((n) => ({ _id: String(n), name: String(n), shorthand: String(n), description: "" }));
}

function _mapRoles(appState, variations) {
  return (appState.roles || []).map((role) => ({
    name: role.name,
    shorthand: role.shorthand || role.name.substring(0, 2).toLowerCase(),
    minContrast: parseFloat(role.minContrast !== undefined ? role.minContrast : 4.5),
    mappingMethod: role.mappingMethod === "index" ? "index" : "contrast",
    variationTargets: role.variationTargets || variations.map((_, i) => _getVariationTargets()[i] || 4.5),
    scaleAlgorithm: role.scaleAlgorithm || null,
    solverMode: role.solverMode || null, // null = fall back to config.solverMode
    description: role.description || "",
    customVariationList: role.customVariationList || false,
    customVariations:
      role.customVariationList && role.customVariations && role.customVariations.length > 0
        ? role.customVariations.map(function (v) {
            return Object.assign({}, v);
          })
        : [],
  }));
}

function buildVariableRenameMap(savedAppState, newAppState) {
  if (!savedAppState || !newAppState) {
    return { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };
  }

  const oldCfg = translateConfig(savedAppState);
  const newCfg = translateConfig(newAppState);
  const oldStepNames = oldCfg.scaleStepNames || seriesMaker(oldCfg.scaleLength);
  const newStepNames = newCfg.scaleStepNames || seriesMaker(newCfg.scaleLength);

  const colorLabels = _mapIdToLabel(savedAppState.colors, newAppState.colors, oldCfg.useShorthandColors, newCfg.useShorthandColors);
  const roleLabels = _mapIdToLabel(savedAppState.roles, newAppState.roles, oldCfg.useShorthandRoles, newCfg.useShorthandRoles);

  const scaleRenames = _getScaleRenames(colorLabels.pairs, oldStepNames, newStepNames, Math.min(oldCfg.scaleLength, newCfg.scaleLength));
  const tokenRenames = _getTokenRenames(colorLabels.pairs, roleLabels.pairs, oldCfg, newCfg);

  return {
    scale: scaleRenames,
    tokens: tokenRenames,
    summary: {
      scaleCount: Object.keys(scaleRenames).length,
      tokenCount: Object.keys(tokenRenames).length,
      changes: _getSummaryChanges(colorLabels.pairs, roleLabels.pairs, oldCfg, newCfg, oldStepNames, newStepNames),
    },
  };
}

function _mapIdToLabel(oldItems, newItems, oldShort, newShort) {
  const getMap = (items, useShort) => {
    const m = {};
    (items || []).forEach((item) => {
      if (item._id) m[item._id] = { label: useShort && item.shorthand ? item.shorthand : item.name, item };
    });
    return m;
  };
  const oldMap = getMap(oldItems, oldShort);
  const newMap = getMap(newItems, newShort);
  const pairs = Object.entries(newMap)
    .filter(([id]) => oldMap[id] !== undefined)
    .map(([id, { label: ncl, item: newItem }]) => ({ oldLabel: oldMap[id].label, newLabel: ncl, oldItem: oldMap[id].item, newItem }));
  return { pairs };
}

function _getScaleRenames(colorPairs, oldSteps, newSteps, count) {
  const renames = {};
  for (const { oldLabel, newLabel } of colorPairs) {
    for (let i = 0; i < count; i++) {
      if (oldSteps[i] === undefined || newSteps[i] === undefined) continue;
      const oldN = `${oldLabel}/${oldSteps[i]}`;
      const newN = `${newLabel}/${newSteps[i]}`;
      if (oldN !== newN) renames[oldN] = newN;
    }
  }
  return renames;
}

function _getTokenRenames(colorPairs, rolePairs, oldCfg, newCfg) {
  const renames = {};
  const oldOrder = oldCfg.tokenNameSegments || (oldCfg.tokenGrouping === "role" ? ["role", "color", "variation"] : ["color", "role", "variation"]);
  const newOrder = newCfg.tokenNameSegments || (newCfg.tokenGrouping === "role" ? ["role", "color", "variation"] : ["color", "role", "variation"]);
  const buildName = (order, color, role, variation) =>
    order.map((s) => ({ color, role, variation })[s] || s).join("/");

  const getVarMap = (cfg, roleItem) => {
    const vars =
      roleItem && roleItem.customVariationList && roleItem.customVariations && roleItem.customVariations.length > 0
        ? roleItem.customVariations
        : cfg.variations || [];
    const map = new Map();
    vars.forEach((v, i) => {
      const id = (v && v._id) ? v._id : String(i);
      const name = (cfg.useShorthandVariations && v && v.shorthand) ? v.shorthand : ((v && v.name) || String(i));
      map.set(id, name);
    });
    return map;
  };

  for (const cp of colorPairs) {
    for (const rp of rolePairs) {
      const oldVarMap = getVarMap(oldCfg, rp.oldItem);
      const newVarMap = getVarMap(newCfg, rp.newItem);
      for (const [vid, oldVarName] of oldVarMap) {
        if (!newVarMap.has(vid)) continue;
        const newVarName = newVarMap.get(vid);
        const oldName = buildName(oldOrder, cp.oldLabel, rp.oldLabel, oldVarName);
        const newName = buildName(newOrder, cp.newLabel, rp.newLabel, newVarName);
        if (oldName !== newName) renames[oldName] = newName;
      }
    }
  }
  return renames;
}

function _getSummaryChanges(colorPairs, rolePairs, oldCfg, newCfg, oldSteps, newSteps) {
  const changes = [];
  colorPairs.forEach((p) => {
    if (p.oldLabel !== p.newLabel) changes.push({ type: "color", from: p.oldLabel, to: p.newLabel });
  });
  rolePairs.forEach((p) => {
    if (p.oldLabel !== p.newLabel) changes.push({ type: "role", from: p.oldLabel, to: p.newLabel });
  });

  const sample = (s) => s.slice(0, 3).join(",") + (s.length > 3 ? "…" : "");
  if (sample(oldSteps) !== sample(newSteps)) changes.push({ type: "stepNames", from: sample(oldSteps), to: sample(newSteps) });
  const oldOrder = (oldCfg.tokenNameSegments || []).join(",");
  const newOrder = (newCfg.tokenNameSegments || []).join(",");
  if (oldOrder !== newOrder) changes.push({ type: "grouping", from: oldOrder, to: newOrder });

  return changes;
}

/* shared/exportEng/helpers.js */
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

function _slug(str) {
  if (!str) return "";
  return String(str).toLowerCase().trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function _camel(parts) {
  return parts.map(function(p, i) {
    var s = _slug(p).replace(/-([a-z0-9])/g, function(_, c) { return c.toUpperCase(); });
    return i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
  }).join("");
}

function _snake(parts) {
  return parts.map(function(p) { return _slug(p).replace(/-/g, "_"); }).join("_");
}

function _hexComponents(hex) {
  var h = hex.replace(/^#/, "");
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function _splitTokenRef(ref) {
  var last = ref.lastIndexOf("-");
  return { color: ref.substring(0, last), step: ref.substring(last + 1) };
}

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

/* shared/exportEng/fmtCSS.js */
var fmtCSS = {

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

/* shared/exportEng/fmtSCSS.js */
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

/* shared/exportEng/fmtTailwind.js */
var fmtTailwind = {

  config: function(result, config) {
    var lines = [];
    lines.push("/" + "** @type {import" + "('tailwindcss').Config} *" + "/");
    lines.push("module.exports = {");
    lines.push("  theme: {");
    lines.push("    extend: {");
    lines.push("      colors: {");

    var scaleNames = Object.keys(result.scales || {});
    for (var ci = 0; ci < scaleNames.length; ci++) {
      var colorName = scaleNames[ci];
      var cLabel = _colorLabel(colorName, config);
      var scale = result.scales[colorName];
      var steps = Object.keys(scale);
      lines.push("        " + JSON.stringify(_slug(cLabel)) + ": {");
      for (var si = 0; si < steps.length; si++) {
        var step = steps[si];
        var stepSlug = _slug(_stepLabel(step, config));
        var varName = "--" + _slug(cLabel) + "-" + stepSlug;
        lines.push("          " + JSON.stringify(stepSlug) + ": \"var(" + varName + ")\",");
      }
      lines.push("        },");
    }

    var themeKeys = Object.keys(result.tokens || {});
    if (themeKeys.length > 0) {
      var firstTheme = themeKeys[0];
      var themeTokens = result.tokens[firstTheme];
      if (themeTokens) {
        lines.push("        // Semantic tokens (CSS var references)");
        var colorNames = Object.keys(themeTokens);
        for (var ci2 = 0; ci2 < colorNames.length; ci2++) {
          var colorName2 = colorNames[ci2];
          var cLabel2 = _colorLabel(colorName2, config);
          var roles = themeTokens[colorName2];
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
              var segs = _tokenSegments(cLabel2, rLabel, vLabel, config);
              var tokenKey = segs.map(_slug).join("-");
              var varRef = "--" + tokenKey;
              lines.push("        " + JSON.stringify(tokenKey) + ": \"var(" + varRef + ")\",");
            }
          }
        }
      }
    }

    lines.push("      },");
    lines.push("    },");
    lines.push("  },");
    lines.push("  plugins: [],");
    lines.push("};");
    return lines.join("\n");
  },
};

/* shared/exportEng/fmtDTCG.js */
var fmtDTCG = {

  scale: function(result, config) {
    var out = {};
    var scaleNames = Object.keys(result.scales || {});
    for (var ci = 0; ci < scaleNames.length; ci++) {
      var colorName = scaleNames[ci];
      var cLabel = _slug(_colorLabel(colorName, config));
      var scale = result.scales[colorName];
      out[cLabel] = {};
      var steps = Object.keys(scale);
      for (var si = 0; si < steps.length; si++) {
        var step = steps[si];
        var entry = scale[step];
        var stepKey = _slug(_stepLabel(step, config));
        var node = { "$value": entry.value, "$type": "color" };
        if (config.includeDescriptions !== false && entry.description) {
          node["$description"] = entry.description;
        }
        out[cLabel][stepKey] = node;
      }
    }
    return JSON.stringify(out, null, 2);
  },

  theme: function(result, config, themeName) {
    var themeTokens = result.tokens && result.tokens[themeName];
    if (!themeTokens) return "{}";

    var out = {};
    var colorNames = Object.keys(themeTokens);
    for (var ci = 0; ci < colorNames.length; ci++) {
      var colorName = colorNames[ci];
      var cLabel = _slug(_colorLabel(colorName, config));
      if (!out[cLabel]) out[cLabel] = {};
      var roles = themeTokens[colorName];
      var roleIds = Object.keys(roles);
      for (var ri = 0; ri < roleIds.length; ri++) {
        var roleId = roleIds[ri];
        var roleObj = (config.roles && config.roles[roleId]) || { name: roleId };
        var rLabel = _slug(_roleLabel(roleObj, config));
        if (!out[cLabel][rLabel]) out[cLabel][rLabel] = {};
        var varDefs = _variationDefs(roleObj, config);
        var variations = roles[roleId];
        for (var vi = 0; vi < varDefs.length; vi++) {
          var token = variations[String(vi)];
          if (!token) continue;
          var vLabel = _slug(_varLabel(varDefs[vi], config));
          var dtcgValue;
          if (token.tokenRef) {
            var parts = _splitTokenRef(token.tokenRef);
            dtcgValue = "{" + _slug(parts.color) + "." + _slug(parts.step) + "}";
          } else {
            dtcgValue = token.value;
          }
          var node = { "$value": dtcgValue, "$type": "color" };
          if (token.isAdjusted) node["$description"] = "⚠ Adjusted for contrast";
          out[cLabel][rLabel][vLabel] = node;
        }
      }
    }
    return JSON.stringify(out, null, 2);
  },
};

/* shared/exportEng/fmtStyleDictionary.js */
var fmtStyleDictionary = {

  global: function(result, config) {
    var out = { color: {} };
    var scaleNames = Object.keys(result.scales || {});
    for (var ci = 0; ci < scaleNames.length; ci++) {
      var colorName = scaleNames[ci];
      var cLabel = _slug(_colorLabel(colorName, config));
      out.color[cLabel] = {};
      var scale = result.scales[colorName];
      var steps = Object.keys(scale);
      for (var si = 0; si < steps.length; si++) {
        var step = steps[si];
        var entry = scale[step];
        var stepKey = _slug(_stepLabel(step, config));
        out.color[cLabel][stepKey] = {
          value: entry.value,
          type: "color",
          attributes: { category: "color", scale: cLabel, step: stepKey },
        };
      }
    }
    return JSON.stringify(out, null, 2);
  },

  theme: function(result, config, themeName) {
    var themeTokens = result.tokens && result.tokens[themeName];
    if (!themeTokens) return "{}";

    var out = { color: {} };
    var colorNames = Object.keys(themeTokens);
    for (var ci = 0; ci < colorNames.length; ci++) {
      var colorName = colorNames[ci];
      var cLabel = _slug(_colorLabel(colorName, config));
      if (!out.color[cLabel]) out.color[cLabel] = {};
      var roles = themeTokens[colorName];
      var roleIds = Object.keys(roles);
      for (var ri = 0; ri < roleIds.length; ri++) {
        var roleId = roleIds[ri];
        var roleObj = (config.roles && config.roles[roleId]) || { name: roleId };
        var rLabel = _slug(_roleLabel(roleObj, config));
        if (!out.color[cLabel][rLabel]) out.color[cLabel][rLabel] = {};
        var varDefs = _variationDefs(roleObj, config);
        var variations = roles[roleId];
        for (var vi = 0; vi < varDefs.length; vi++) {
          var token = variations[String(vi)];
          if (!token) continue;
          var vLabel = _slug(_varLabel(varDefs[vi], config));
          var sdValue;
          if (token.tokenRef) {
            var parts = _splitTokenRef(token.tokenRef);
            sdValue = "{color." + _slug(parts.color) + "." + _slug(parts.step) + "}";
          } else {
            sdValue = token.value;
          }
          out.color[cLabel][rLabel][vLabel] = {
            value: sdValue,
            type: "color",
            attributes: { category: "color", role: rLabel, theme: themeName },
          };
        }
      }
    }
    return JSON.stringify(out, null, 2);
  },
};

/* shared/exportEng/fmtSwift.js */
var fmtSwift = {

  file: function(result, config, themeName) {
    var themeTokens = result.tokens && result.tokens[themeName];
    var lines = [];
    var systemName = config.name || "Tokens";

    lines.push("// " + systemName + " — " + themeName + " theme");
    lines.push("// Auto-generated by Token Wand. Do not edit manually.");
    lines.push("import UIKit");
    lines.push("import SwiftUI");
    lines.push("");

    var scaleNames = Object.keys(result.scales || {});

    lines.push("// MARK: - UIColor Scale (" + themeName + ")");
    lines.push("extension UIColor {");
    for (var ci = 0; ci < scaleNames.length; ci++) {
      var colorName = scaleNames[ci];
      var cLabel = _colorLabel(colorName, config);
      var scale = result.scales[colorName];
      var steps = Object.keys(scale);
      for (var si = 0; si < steps.length; si++) {
        var step = steps[si];
        var entry = scale[step];
        var varName = _camel([cLabel, "scale", _stepLabel(step, config)]);
        var rgb = _hexComponents(entry.value);
        lines.push("  static let " + varName + " = UIColor(red: " + (rgb.r / 255).toFixed(4) + ", green: " + (rgb.g / 255).toFixed(4) + ", blue: " + (rgb.b / 255).toFixed(4) + ", alpha: 1)");
      }
    }
    lines.push("}\n");

    if (themeTokens) {
      lines.push("// MARK: - UIColor Semantic Tokens (" + themeName + ")");
      lines.push("extension UIColor {");
      _eachToken(result, config, function(theme, colorName, roleObj, varDef, token, cLabel, rLabel, vLabel, segs) {
        if (theme !== themeName) return;
        var varName = _camel(segs);
        var rgb = _hexComponents(token.value);
        lines.push("  static let " + varName + " = UIColor(red: " + (rgb.r / 255).toFixed(4) + ", green: " + (rgb.g / 255).toFixed(4) + ", blue: " + (rgb.b / 255).toFixed(4) + ", alpha: 1)");
      });
      lines.push("}\n");

      lines.push("// MARK: - SwiftUI Color Semantic Tokens (" + themeName + ")");
      lines.push("extension Color {");
      _eachToken(result, config, function(theme, colorName, roleObj, varDef, token, cLabel, rLabel, vLabel, segs) {
        if (theme !== themeName) return;
        var varName = _camel(segs);
        var rgb = _hexComponents(token.value);
        lines.push("  static let " + varName + " = Color(red: " + (rgb.r / 255).toFixed(4) + ", green: " + (rgb.g / 255).toFixed(4) + ", blue: " + (rgb.b / 255).toFixed(4) + ")");
      });
      lines.push("}");
    }

    return lines.join("\n");
  },
};

/* shared/exportEng/fmtAndroid.js */
var fmtAndroid = {

  file: function(result, config, themeName) {
    var themeTokens = result.tokens && result.tokens[themeName];
    var lines = [];
    lines.push("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
    lines.push("<resources>");
    lines.push("");

    var scaleNames = Object.keys(result.scales || {});
    if (scaleNames.length > 0) {
      lines.push("    <!-- Color Scales -->");
      for (var ci = 0; ci < scaleNames.length; ci++) {
        var colorName = scaleNames[ci];
        var cLabel = _colorLabel(colorName, config);
        var scale = result.scales[colorName];
        var steps = Object.keys(scale);
        lines.push("    <!-- " + colorName + " -->");
        for (var si = 0; si < steps.length; si++) {
          var step = steps[si];
          var entry = scale[step];
          var resName = _snake([cLabel, _stepLabel(step, config)]);
          var argb = _toARGB(entry.value);
          lines.push("    <color name=\"" + resName + "\">" + argb + "</color>");
        }
      }
      lines.push("");
    }

    if (themeTokens) {
      lines.push("    <!-- Semantic Tokens — " + themeName + " -->");
      var colorNames = Object.keys(themeTokens);
      for (var ci2 = 0; ci2 < colorNames.length; ci2++) {
        var colorName2 = colorNames[ci2];
        var cLabel2 = _colorLabel(colorName2, config);
        lines.push("    <!-- " + colorName2 + " -->");
        var roles = themeTokens[colorName2];
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
            var segs = _tokenSegments(cLabel2, rLabel, vLabel, config);
            var resName2 = _snake(segs);
            var argb2 = _toARGB(token.value);
            lines.push("    <color name=\"" + resName2 + "\">" + argb2 + "</color>");
          }
        }
      }
      lines.push("");
    }

    lines.push("</resources>");
    return lines.join("\n");
  },
};

function _toARGB(hex) {
  var rgb = _hexComponents(hex);
  var toHex2 = function(n) { var s = n.toString(16).toUpperCase(); return s.length === 1 ? "0" + s : s; };
  return "#FF" + toHex2(rgb.r) + toHex2(rgb.g) + toHex2(rgb.b);
}

/* shared/exportEng/fmtReactNative.js */
var fmtReactNative = {

  theme: function(result, config, themeName) {
    var themeTokens = result.tokens && result.tokens[themeName];
    var lines = [];
    lines.push("// " + (config.name || "tokens") + " — " + themeName + " theme tokens");
    lines.push("// Auto-generated by Token Wand. Do not edit manually.\n");
    lines.push("export const " + _camel([themeName]) + "Tokens = {");

    var scaleNames = Object.keys(result.scales || {});
    if (scaleNames.length > 0) {
      lines.push("  scale: {");
      for (var ci = 0; ci < scaleNames.length; ci++) {
        var colorName = scaleNames[ci];
        var cLabel = _colorLabel(colorName, config);
        var scale = result.scales[colorName];
        lines.push("    " + _camel([cLabel]) + ": {");
        var steps = Object.keys(scale);
        for (var si = 0; si < steps.length; si++) {
          var step = steps[si];
          var entry = scale[step];
          lines.push("      " + JSON.stringify(_slug(_stepLabel(step, config))) + ": " + JSON.stringify(entry.value) + " as string,");
        }
        lines.push("    },");
      }
      lines.push("  },");
    }

    if (themeTokens) {
      lines.push("  tokens: {");
      var colorNames = Object.keys(themeTokens);
      for (var ci2 = 0; ci2 < colorNames.length; ci2++) {
        var colorName2 = colorNames[ci2];
        var cLabel2 = _colorLabel(colorName2, config);
        lines.push("    " + _camel([cLabel2]) + ": {");
        var roles = themeTokens[colorName2];
        var roleIds = Object.keys(roles);
        for (var ri = 0; ri < roleIds.length; ri++) {
          var roleId = roleIds[ri];
          var roleObj = (config.roles && config.roles[roleId]) || { name: roleId };
          var rLabel = _roleLabel(roleObj, config);
          lines.push("      " + _camel([rLabel]) + ": {");
          var varDefs = _variationDefs(roleObj, config);
          var variations = roles[roleId];
          for (var vi = 0; vi < varDefs.length; vi++) {
            var token = variations[String(vi)];
            if (!token) continue;
            var vLabel = _varLabel(varDefs[vi], config);
            lines.push("        " + JSON.stringify(_slug(vLabel)) + ": " + JSON.stringify(token.value) + " as string,");
          }
          lines.push("      },");
        }
        lines.push("    },");
      }
      lines.push("  },");
    }

    lines.push("} as const;\n");
    lines.push("export type " + _camel([themeName]) + "TokensType = typeof " + _camel([themeName]) + "Tokens;");
    return lines.join("\n");
  },

  index: function(result, config) {
    var themeKeys = Object.keys(result.tokens || {});
    var lines = [];
    lines.push("// " + (config.name || "tokens") + " — token index");
    lines.push("// Auto-generated by Token Wand. Do not edit manually.\n");

    for (var ti = 0; ti < themeKeys.length; ti++) {
      var theme = themeKeys[ti];
      lines.push("import { " + _camel([theme]) + "Tokens } from './" + _slug(theme) + "';");
    }
    lines.push("");

    lines.push("export type Theme = " + themeKeys.map(function(t) { return JSON.stringify(t); }).join(" | ") + ";");
    lines.push("");
    lines.push("const themeMap = {");
    for (var ti2 = 0; ti2 < themeKeys.length; ti2++) {
      var theme2 = themeKeys[ti2];
      lines.push("  " + JSON.stringify(theme2) + ": " + _camel([theme2]) + "Tokens,");
    }
    lines.push("} as const;\n");

    lines.push("export function useTokens(theme: Theme) {");
    lines.push("  return themeMap[theme] ?? themeMap[" + JSON.stringify(themeKeys[0] || "light") + "];");
    lines.push("}\n");

    for (var ti3 = 0; ti3 < themeKeys.length; ti3++) {
      var theme3 = themeKeys[ti3];
      lines.push("export { " + _camel([theme3]) + "Tokens } from './" + _slug(theme3) + "';");
    }

    return lines.join("\n");
  },
};

/* shared/exportEng/bundler.js */
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

/* figma/figmaVars.js */
const VariableManager = {
  tally: { created: 0, updated: 0, renamed: 0, failed: 0 },
  cache: { variables: [], collections: [] },
  scaleVarNameMap: {}, // entry.stepName (e.g. "Primary-18") → Figma variable path (e.g. "Primary/18")

  async applyRenames(collection, renameMap) {
    if (!collection || !renameMap || Object.keys(renameMap).length === 0) return 0;
    let renamed = 0;
    const colVars = this.cache.variables.filter((v) => v.variableCollectionId === collection.id);
    const occupiedNames = new Set(colVars.map((v) => v.name));

    for (let pass = 0; pass < 2; pass++) {
      for (const variable of colVars) {
        const newName = renameMap[variable.name];
        if (!newName || newName === variable.name) continue;
        if (occupiedNames.has(newName)) continue; // target name still in use; retry next pass
        try {
          const oldName = variable.name;
          occupiedNames.delete(oldName);
          variable.name = newName;
          const confirmed = variable.name;
          occupiedNames.add(confirmed);
          if (confirmed === newName) renamed++;
        } catch (e) {
          console.warn("Rename failed for variable:", variable.name, e);
        }
      }
    }

    this.tally.renamed += renamed;
    return renamed;
  },

  async sync(result, config, scope = "all", appState = null, savedAppState = null) {
    this.tally = { created: 0, updated: 0, renamed: 0, failed: 0 };
    this.scaleVarNameMap = {};
    await this.refreshCache();

    const renameMap = savedAppState && appState ? buildVariableRenameMap(savedAppState, appState) : { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };

    const scaleCollectionName = (appState && appState.scaleCollectionName) || "_scale";
    const tokenColName = (appState && appState.tokenCollectionName) || "color tokens";
    const skipScales = config.resolveTokensDirectly || config.pluginMode === "direct" || config.includeColorScalesCollection === false;
    const tokenNameOrder = config.tokenNameSegments || (config.tokenGrouping === "role" ? ["role", "color", "variation"] : ["color", "role", "variation"]);
    const useShortColor = config.useShorthandColors || false;
    const useShortRole = config.useShorthandRoles || false;
    const useShortStep = config.useShorthandSteps || false;
    const stepShorthands = config.scaleStepShorthands || {};

    const colorLabel = (name) => {
      if (!useShortColor) return name;
      const col = config.colors.find((c) => c.name === name);
      return (col && col.shorthand) || name;
    };
    const roleLabel = (name, roleIdx) => {
      if (!useShortRole) return name;
      const role = config.roles[roleIdx];
      return (role && role.shorthand) || name;
    };
    const stepLabel = (name) => (useShortStep && stepShorthands[name]) ? stepShorthands[name] : name;

    for (const [colorName, scale] of Object.entries(result.scales)) {
      for (const [step, entry] of Object.entries(scale)) {
        this.scaleVarNameMap[entry.stepName] = `${colorLabel(colorName)}/${stepLabel(step)}`;
      }
    }

    const needsScaleCol = !skipScales && (scope === "all" || scope === "groups" || scope === "roles");
    const scaleCol = needsScaleCol ? await this.getOrCreateCollection(scaleCollectionName) : null;

    if (scaleCol && renameMap.scale && Object.keys(renameMap.scale).length > 0) {
      await this.applyRenames(scaleCol, renameMap.scale);
    }

    if (scaleCol && (scope === "all" || scope === "groups")) {
      const modeId = scaleCol.modes[0].modeId;
      const include = config.includeDescriptions !== false;
      const allScaleVars = [];

      for (const [colorName, scale] of Object.entries(result.scales)) {
        const cLabel = colorLabel(colorName);
        for (const [step, entry] of Object.entries(scale)) {
          const contrastNote = include ? `L:${entry.contrast.light.ratio}(${entry.contrast.light.rating}) D:${entry.contrast.dark.ratio}(${entry.contrast.dark.rating})` : "";
          const groupDesc = include ? entry.description : "";
          const fullDesc = groupDesc && contrastNote ? `${groupDesc} | ${contrastNote}` : groupDesc || contrastNote;
          allScaleVars.push([`${cLabel}/${stepLabel(step)}`, "COLOR", entry.value, fullDesc]);
        }
      }
      await this.upsertVariables(scaleCol, modeId, allScaleVars);
    }

    if (scope === "all" || scope === "roles") {
      const tokenCol = await this.getOrCreateCollection(tokenColName);

      if (renameMap.tokens && Object.keys(renameMap.tokens).length > 0) {
        await this.applyRenames(tokenCol, renameMap.tokens);
      }

      const skippedModes = [];
      for (const theme of Object.keys(result.tokens || {})) {
        const modeId = this.ensureMode(tokenCol, theme);
        if (modeId === null) {
          skippedModes.push(theme);
          continue;
        }
        for (const [colorName, roles] of Object.entries(result.tokens[theme])) {
          for (const [roleId, variations] of Object.entries(roles)) {
            const roleObj = (config.roles && config.roles[roleId]) || {};
            const rName = roleObj.name || roleId;
            const cLabel = colorLabel(colorName);
            const rLabel = roleLabel(rName, parseInt(roleId, 10));
            const variationDefs = roleObj.customVariationList && roleObj.customVariations && roleObj.customVariations.length > 0
              ? roleObj.customVariations
              : config.variations;
            const vars = variationDefs
              .map((varDef, i) => {
                const token = variations[String(i)];
                if (!token) return null;
                const dispName = varDef.shorthand || varDef.name;
                const segParts = { color: cLabel, role: rLabel, variation: dispName };
                const figmaName = tokenNameOrder.map((s) => segParts[s] || s).join("/");
                let value;
                if (skipScales) {
                  value = token.value;
                } else {
                  const scaleFigmaName = this.scaleVarNameMap[token.tokenRef];
                  const targetVar = scaleFigmaName && scaleCol ? this.cache.variables.find((cv) => cv.name === scaleFigmaName && cv.variableCollectionId === scaleCol.id) : null;
                  value = targetVar ? { type: "VARIABLE_ALIAS", id: targetVar.id } : token.value;
                }
                const include = config.includeDescriptions !== false;
                const note = include && token.isAdjusted ? " | ⚠ Adjusted" : "";
                const themeNote = include ? theme.toUpperCase() : "";
                const roleDesc = include ? token.roleDescription : "";

                let fullDesc = "";
                if (roleDesc && themeNote) fullDesc = `${roleDesc} | ${themeNote}${note}`;
                else if (roleDesc) fullDesc = roleDesc;
                else if (themeNote) fullDesc = `${themeNote}${note}`;

                return [figmaName, "COLOR", value, fullDesc];
              })
              .filter(Boolean);
            await this.upsertVariables(tokenCol, modeId, vars);
          }
        }
      }
      if (skippedModes.length > 0) {
        figma.ui.postMessage({
          type: "warning",
          message: `The "${tokenColName}" token collection is missing the ${skippedModes.join(" and ")} mode(s). Multiple modes per collection require a paid Figma plan.`,
        });
      }
    }

    if (config.includeSourceColors) {
      await this.syncGlobalColors(config);
    }

    if (appState) savePluginConfig(appState);

    figma.ui.postMessage({ type: "finish", tally: this.tally, errors: result ? result.errors : null, result });
  },

  async refreshCache() {
    this.cache.variables = await figma.variables.getLocalVariablesAsync();
    this.cache.collections = await figma.variables.getLocalVariableCollectionsAsync();
  },

  async getOrCreateCollection(name) {
    const existing = this.cache.collections.find((c) => c.name === name);
    if (existing) return existing;
    const newCol = figma.variables.createVariableCollection(name);
    this.cache.collections.push(newCol);
    return newCol;
  },

  ensureMode(collection, modeName) {
    const existing = collection.modes.find((m) => m.name.toLowerCase() === modeName.toLowerCase());
    if (existing) return existing.modeId;
    if (collection.modes.length === 1 && collection.modes[0].name.toLowerCase().startsWith("mode")) {
      collection.renameMode(collection.modes[0].modeId, modeName);
      return collection.modes[0].modeId;
    }
    try {
      return collection.addMode(modeName);
    } catch (_e) {

      return null;
    }
  },

  async syncGlobalColors(config) {
    const colName = config.sourceCollectionName || "_constants";
    const col = await this.getOrCreateCollection(colName);
    const modeId = col.modes[0].modeId;

    const vars = [];
    for (const color of config.colors) {
      const hex = "#" + color.value.replace(/^#/, "").toUpperCase().padEnd(6, "0");
      const label = config.useShorthandColors && color.shorthand ? color.shorthand : color.name;
      const include = config.includeDescriptions !== false;
      const groupDesc = include ? color.description || "Brand constant — raw hex, no theme processing" : "";
      vars.push([`${label}/${label}`, "COLOR", hex, groupDesc]);

      if (config.includeAlphaTints && config.alphaValues.length > 0) {
        const rgb = hexToFigmaRgb(hex);
        for (const opacityInt of config.alphaValues) {
          const alpha = opacityInt / 100;
          const varName = `${label}/Opacities/${opacityInt}`;
          try {
            let variable = this.cache.variables.find((v) => v.name === varName && v.variableCollectionId === col.id);
            if (!variable) {
              variable = figma.variables.createVariable(varName, col, "COLOR");
              this.cache.variables.push(variable);
              this.tally.created++;
            } else {
              this.tally.updated++;
            }
            variable.description = `${opacityInt}% opacity variant`;
            variable.setValueForMode(modeId, { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha });
          } catch (_err) {
            this.tally.failed++;
          }
        }
      }
    }
    await this.upsertVariables(col, modeId, vars);
  },

  async upsertVariables(collection, modeId, vars) {
    for (const [varName, varType, varValue, varDescription] of vars) {
      try {
        let variable = this.cache.variables.find((v) => v.name === varName && v.variableCollectionId === collection.id);
        if (!variable) {
          variable = figma.variables.createVariable(varName, collection, varType);
          this.cache.variables.push(variable);
          this.tally.created++;
        } else {
          this.tally.updated++;
        }
        if (varDescription) variable.description = varDescription;
        if (varValue !== undefined && varValue !== null) {
          if (varType === "COLOR" && typeof varValue === "string") {
            variable.setValueForMode(modeId, hexToFigmaRgb(varValue));
          } else {
            variable.setValueForMode(modeId, varValue);
          }
        }
      } catch (_err) {
        console.error("Failed to upsert variable:", varName, _err);
        this.tally.failed++;
      }
    }
  },
};

function hexToFigmaRgb(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return { r: 0, g: 0, b: 0 };
  return { r: rgb[0] / 255, g: rgb[1] / 255, b: rgb[2] / 255 };
}

function savePluginConfig(appState) {
  try {
    figma.root.setPluginData("tw_state", JSON.stringify(appState));
  } catch (e) {
    console.warn("savePluginConfig failed:", e);
  }
}

/* figma/main.js */
const UI = { WIDTH: 620, HEIGHT: 720, MIN_WIDTH: 440, MIN_HEIGHT: 480 };

(async () => {

  let savedUiSize = { width: UI.WIDTH, height: UI.HEIGHT };
  try {
    const saved = await figma.clientStorage.getAsync("uiPrefs");
    if (saved && saved.width && saved.height) savedUiSize = saved;
  } catch (e) {
    console.warn("Failed to load uiPrefs:", e);
  }
  figma.showUI(__html__, { width: savedUiSize.width, height: savedUiSize.height, themeColors: true });

  const capabilities = { multiMode: true };
  let probeCol = null;
  try {
    probeCol = figma.variables.createVariableCollection("__tw_probe__");
    probeCol.addMode("probe2");
  } catch (e) {
    console.warn("Probe failed:", e);
    capabilities.multiMode = false;
  } finally {
    if (probeCol)
      try {
        probeCol.remove();
      } catch (e) {
        console.warn("Failed to remove probe collection:", e);
      }
  }
  figma.ui.postMessage({ type: "capabilities", capabilities });

  try {
    const meta = await figma.clientStorage.getAsync("uiPrefsMeta");
    if (meta) figma.ui.postMessage({ type: "load-ui-prefs-meta", prefs: meta });
  } catch (e) {
    console.warn("Failed to load uiPrefsMeta:", e);
  }

  try {
    const savedConfigStr = figma.root.getPluginData("tw_state");
    if (savedConfigStr) {
      figma.ui.postMessage({ type: "load-config", state: JSON.parse(savedConfigStr) });
    }
  } catch (e) {
    console.warn("Failed to load saved config:", e);
  }
})();

figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case "run-creator": {
        const config = translateConfig(msg.state);
        const result = variableMaker(config);
        await VariableManager.sync(result, config, msg.scope || "all", msg.state, msg.savedState || null);
        break;
      }

      case "check-collections": {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const names = [msg.colorName, msg.tokenColName].filter(Boolean);
        const existing = names.filter((n) => cols.some((c) => c.name === n));
        const renames = msg.savedState && msg.state ? buildVariableRenameMap(msg.savedState, msg.state) : { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };
        figma.ui.postMessage({ type: "collection-check-result", existing, renames });
        break;
      }

      case "resize": {
        const w = Math.max(UI.MIN_WIDTH, msg.width);
        const h = Math.max(UI.MIN_HEIGHT, msg.height);
        figma.ui.resize(w, h);
        figma.clientStorage.setAsync("uiPrefs", { width: w, height: h }).catch(() => {});
        break;
      }

      case "save-ui-prefs-meta":
        figma.clientStorage.setAsync("uiPrefsMeta", msg.prefs).catch(() => {});
        break;

      case "request-processed-data": {
        const config = translateConfig(msg.state);
        const result = variableMaker(config);
        let content = "";
        const et = msg.exportType;
        if (et === "json") content = JSON.stringify({ config, scales: result.scales, tokens: result.tokens, errors: result.errors }, null, 2);
        else if (et === "csv") content = ExportFormatter.toCSV(result, config);
        else if (et === "css") content = ExportFormatter.toCSS(result, config);
        else if (et === "scss") content = generateScss(result, config);
        else if (et === "tailwind") content = fmtTailwind.config(result, config);
        else if (et === "dtcg") content = fmtDTCG.scale(result, config);
        else if (et === "style-dictionary") content = fmtStyleDictionary.global(result, config);
        else if (et === "ios-swift") {
          const themeKeys = Object.keys(result.tokens || {});
          content = themeKeys.map(function(t) { return fmtSwift.file(result, config, t); }).join("\n\n");
        }
        else if (et === "android") {
          const themeKeys2 = Object.keys(result.tokens || {});
          content = themeKeys2.map(function(t) { return fmtAndroid.file(result, config, t); }).join("\n\n");
        }
        else if (et === "rn-ts") content = fmtReactNative.index(result, config);
        figma.ui.postMessage({ type: "processed-data-response", content, exportType: msg.exportType });
        break;
      }

      case "request-export-bundle": {
        const bConfig = translateConfig(msg.state);
        const bResult = variableMaker(bConfig);
        const bFiles = buildExportBundle(bResult, bConfig, msg.formats || [], msg.state);
        figma.ui.postMessage({ type: "export-bundle-response", files: bFiles });
        break;
      }

      case "save-config":
        savePluginConfig(msg.state);
        break;

      case "cancel":
        figma.closePlugin();
        break;
    }
  } catch (err) {
    console.error("Plugin Error:", err);
    figma.ui.postMessage({ type: "error", message: (err && err.message) || String(err) || "Unknown error" });
  }
};