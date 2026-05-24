/**
 * ============================================================================
 * Token Wand — Automated Test Suite
 * Set TESTS_ENABLED = true to run on plugin load (output goes to DevTools console).
 * Covers: color math, scale generator, contrast solver, token pipeline,
 *         config translator.
 * All tested functions are pure — no Figma API or DOM required.
 * ============================================================================
 */

const TESTS_ENABLED = false;

(function () {
  if (!TESTS_ENABLED) return;

  // ── RUNNER ──────────────────────────────────────────────────────────────────

  let _passed = 0, _failed = 0;
  const _groups = [];

  function group(name, fn) {
    const before = { p: _passed, f: _failed };
    fn();
    const p = _passed - before.p, f = _failed - before.f;
    _groups.push({ name, p, f });
  }

  function assert(label, condition, detail) {
    if (condition) {
      _passed++;
    } else {
      _failed++;
      console.error(`  FAIL  ${label}${detail !== undefined ? ` — got: ${JSON.stringify(detail)}` : ""}`);
    }
  }

  function eq(label, actual, expected) {
    const ok = actual === expected;
    if (!ok) console.error(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    ok ? _passed++ : _failed++;
  }

  function close(label, actual, expected, tol) {
    tol = tol || 0.01;
    const ok = typeof actual === "number" && !isNaN(actual) && Math.abs(actual - expected) <= tol;
    if (!ok) console.error(`  FAIL  ${label} — expected ~${expected} (±${tol}), got ${actual}`);
    ok ? _passed++ : _failed++;
  }

  // ── SECTION 1: clrUtils ───────────────────────────────────────────────────

  group("validHex", () => {
    assert("accepts 6-char with hash",    validHex("#3B82F6"));
    assert("accepts 6-char without hash", validHex("3B82F6"));
    assert("accepts 3-char with hash",    validHex("#FFF"));
    assert("accepts 3-char without hash", validHex("ABC"));
    assert("rejects 5-char",              !validHex("#12345"));
    assert("rejects non-hex chars",       !validHex("#GGGGGG"));
    assert("rejects empty string",        !validHex(""));
    assert("rejects number",              !validHex(123));
  });

  group("normalizeHex", () => {
    eq("expands 3-char to 6-char",     normalizeHex("#FFF"),     "#FFFFFF");
    eq("expands lowercase 3-char",     normalizeHex("#abc"),     "#AABBCC");
    eq("strips hash and uppercases",   normalizeHex("3b82f6"),   "#3B82F6");
    eq("already-normalized is stable", normalizeHex("#3B82F6"),  "#3B82F6");
    eq("returns null for invalid",     normalizeHex("ZZZZZZ"),   null);
    eq("returns null for empty",       normalizeHex(""),         null);
  });

  group("hexToRgb", () => {
    const black = hexToRgb("#000000");
    const white = hexToRgb("#FFFFFF");
    const red   = hexToRgb("#FF0000");
    assert("black → [0,0,0]",           black && black[0] === 0 && black[1] === 0 && black[2] === 0);
    assert("white → [255,255,255]",     white && white[0] === 255 && white[1] === 255 && white[2] === 255);
    assert("red → [255,0,0]",           red && red[0] === 255 && red[1] === 0 && red[2] === 0);
    assert("returns null for invalid",  hexToRgb("ZZZZZZ") === null);
  });

  group("relLum", () => {
    close("black → 0",   relLum("#000000"), 0,      0.001);
    close("white → 1",   relLum("#FFFFFF"), 1,      0.001);
    close("red → 0.2126", relLum("#FF0000"), 0.2126, 0.005);
    eq("returns null for invalid", relLum("INVALID"), null);
  });

  group("contrastRatio", () => {
    close("black/white → 21",   contrastRatio("#000000", "#FFFFFF"), 21,   0.05);
    close("white/black → 21",   contrastRatio("#FFFFFF", "#000000"), 21,   0.05);
    close("same color → 1",     contrastRatio("#888888", "#888888"), 1,    0.05);
    eq("null on invalid input", contrastRatio("INVALID", "#FFFFFF"), null);
  });

  group("contrastRating", () => {
    eq("near-white on white → Fail", contrastRating("#EEEEEE", "#FFFFFF"), "Fail");
    assert("ratio ≥ 3 < 4.5 → AA Large", ["AA Large", "AA", "AAA"].includes(contrastRating("#888888", "#FFFFFF")));
    eq("black/white → AAA",          contrastRating("#000000", "#FFFFFF"), "AAA");
    eq("null on truly invalid",      contrastRating("ZZZZZZ", "#FFFFFF"), null);
  });

  group("sanitizeHex", () => {
    eq("strips hash",          sanitizeHex("#3b82f6"), "3B82F6");
    eq("uppercases",           sanitizeHex("aabbcc"),  "AABBCC");
    eq("clamps to 6 chars",    sanitizeHex("AABBCCDD"), "AABBCC");
    eq("removes non-hex",      sanitizeHex("ZZ3B82F6"), "3B82F6");
    eq("empty input",          sanitizeHex(""),         "");
    eq("handles undefined",    sanitizeHex(undefined),  "");
  });

  group("rgbToHsl", () => {
    const red   = rgbToHsl(255, 0, 0);
    const white = rgbToHsl(255, 255, 255);
    const black = rgbToHsl(0, 0, 0);
    assert("red → hue 0",       red && red[0] === 0);
    assert("red → sat 100",     red && red[1] === 100);
    assert("red → lum 50",      red && red[2] === 50);
    assert("white → lum 100",   white && white[2] === 100);
    assert("black → lum 0",     black && black[2] === 0);
    eq("null on out-of-range",  rgbToHsl(-1, 0, 0), null);
  });

  group("rgbToHex / hslToHex round-trip", () => {
    const hex   = rgbToHex(59, 130, 246);
    assert("produces valid hex",  hex && /^#[0-9A-F]{6}$/.test(hex));
    const back  = hexToRgb(hex);
    assert("round-trip R",        back && back[0] === 59);
    assert("round-trip G",        back && back[1] === 130);
    assert("round-trip B",        back && back[2] === 246);
    eq("null on out-of-range",    rgbToHex(-1, 0, 0), null);
    eq("hslToHex(0,100,50) → #FF0000",     hslToHex(0, 100, 50), "#FF0000");
  });

  // ── SECTION 2: Color spaces (clrEngine) ──────────────────────────────────

  group("hexToOklch / oklchToHex round-trip", () => {
    const samples = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#000000", "#FFFFFF"];
    samples.forEach((hex) => {
      const { L, C, H } = hexToOklch(hex);
      assert(`L in [0,1] for ${hex}`,  L >= 0 && L <= 1);
      assert(`C >= 0 for ${hex}`,      C >= 0);
      assert(`H in [0,360] for ${hex}`, H >= 0 && H <= 360);
      const back = oklchToHex(L, C, H).toUpperCase();
      assert(`round-trip within 2 channels: ${hex}`, back === hex || (() => {
        const [r1, g1, b1] = hexToRgb(hex);
        const [r2, g2, b2] = hexToRgb(back);
        return Math.abs(r1-r2) <= 2 && Math.abs(g1-g2) <= 2 && Math.abs(b1-b2) <= 2;
      })());
    });
  });

  group("hexToHct / hctToHex round-trip", () => {
    const samples = ["#3B82F6", "#EF4444", "#10B981"];
    samples.forEach((hex) => {
      const { h, c, t } = hexToHct(hex);
      assert(`hue in [0,360] for ${hex}`, h >= 0 && h <= 360);
      assert(`chroma >= 0 for ${hex}`,    c >= 0);
      assert(`tone in [0,100] for ${hex}`, t >= 0 && t <= 100);
    });
    const gray = hexToHct("#808080");
    assert("gray has low chroma", gray.c < 5);
  });

  // ── SECTION 3: scaleMaker ────────────────────────────────────────────

  group("scaleMaker — length and validity", () => {
    const algos = ["Natural", "Uniform", "Expressive", "Symmetric", "OKLCH", "Material", "Linear"];
    algos.forEach((algo) => {
      const scale = scaleMaker("#3B82F6", 11, algo);
      eq(`${algo}: returns 11 steps`, scale.length, 11);
      assert(`${algo}: all valid hex`, scale.every((h) => /^#[0-9A-Fa-f]{6}$/i.test(h)));
    });
  });

  group("scaleMaker — light-to-dark ordering", () => {
    ["Natural", "Uniform", "OKLCH", "Material", "Linear"].forEach((algo) => {
      const scale = scaleMaker("#3B82F6", 11, algo);
      const lums = scale.map((h) => relLum(h));
      const ordered = lums.every((v, i) => i === 0 || v <= lums[i - 1] + 0.05);
      assert(`${algo}: roughly light→dark`, ordered);
    });
  });

  group("scaleMaker — scale length variants", () => {
    [5, 11, 23, 25].forEach((len) => {
      const scale = scaleMaker("#0067DD", len, "Natural");
      eq(`length ${len}: correct count`, scale.length, len);
    });
  });

  // ── SECTION 4: solveColorForContrast ──────────────────────────────────────

  group("solveColorForContrast — achieves target (light bg)", () => {
    const bg = "#FFFFFF";
    const source = "#3B82F6";
    const targets = [3.0, 4.5, 7.0];
    const modes = ["natural", "saturated", "luminance", "hue-locked", "chroma-maximized"];
    targets.forEach((t) => {
      modes.forEach((m) => {
        const r = solveColorForContrast(source, t, bg, m);
        assert(`${m} @ ${t}: valid hex output`, /^#[0-9A-Fa-f]{6}$/i.test(r.hex));
        assert(`${m} @ ${t}: achievedContrast >= target`, r.achievedContrast >= t - 0.05);
        assert(`${m} @ ${t}: never undershoots`, !r.clipped || r.achievedContrast >= t - 0.1);
      });
    });
  });

  group("solveColorForContrast — achieves target (dark bg)", () => {
    const bg = "#1A1A2E";
    const source = "#3B82F6";
    [3.0, 4.5].forEach((t) => {
      const r = solveColorForContrast(source, t, bg, "natural");
      assert(`dark bg @ ${t}: valid hex`, /^#[0-9A-Fa-f]{6}$/i.test(r.hex));
      assert(`dark bg @ ${t}: achieved >= target`, r.achievedContrast >= t - 0.05);
    });
  });

  group("solveColorForContrast — impossible target", () => {
    const r = solveColorForContrast("#3B82F6", 25, "#FFFFFF", "natural");
    assert("returns fallback hex for impossible target", r.hex === "#000000" || r.hex === "#FFFFFF");
    assert("warning is set", r.warning !== null);
    assert("clipped flag set", r.clipped === true);
  });

  group("solveColorForContrast — achromatic source stays achromatic", () => {
    const r = solveColorForContrast("#808080", 4.5, "#FFFFFF", "natural");
    const { C } = hexToOklch(r.hex);
    assert("gray source → low chroma result", C < 0.05);
  });

  // ── SECTION 5: validateVariationContrasts ────────────────────────────────

  group("validateVariationContrasts", () => {
    const ok = validateVariationContrasts([1.5, 3.0, 4.5, 7.0, 12.0]);
    assert("ascending targets → valid",    ok.valid === true);
    assert("ascending targets → no errors", ok.errors.length === 0);

    const bad = validateVariationContrasts([1.5, 3.0, 2.0, 7.0]);
    assert("non-ascending → invalid",      bad.valid === false);
    assert("non-ascending → has errors",   bad.errors.length > 0);

    const single = validateVariationContrasts([4.5]);
    assert("single target → valid",        single.valid === true);
  });

  // ── SECTION 6: translateConfig ────────────────────────────────────────────

  group("translateConfig — basic shape", () => {
    const state = {
      name: "Test",
      scaleLength: 11,
      scaleAlgorithm: "Natural",
      pluginMode: "scale",
      colors: [{ name: "Blue", shorthand: "bl", value: "3B82F6", description: "" }],
      roles: [{ name: "Text", shorthand: "tx", minContrast: 4.5, mappingMethod: "contrast", variationTargets: [1.5, 3, 4.5, 7, 12] }],
      themes: [{ name: "Light", bg: "FFFFFF" }, { name: "Dark", bg: "000000" }],
      variations: null,
    };
    const cfg = translateConfig(state);
    eq("scaleLength passed through",  cfg.scaleLength, 11);
    eq("pluginMode passed through",   cfg.pluginMode, "scale");
    eq("color name preserved",        cfg.colors[0].name, "Blue");
    eq("role name preserved",         cfg.roles[0].name, "Text");
    eq("theme count correct",         cfg.themes.length, 2);
    assert("themes deduplicated",     cfg.themes[0].name !== cfg.themes[1].name);
    assert("variations always array", Array.isArray(cfg.variations));
  });

  group("translateConfig — defaults applied", () => {
    const cfg = translateConfig({});
    assert("scaleLength defaults to 23",    cfg.scaleLength === 23);
    assert("pluginMode has default",        typeof cfg.pluginMode === "string");
    assert("colors defaults to array",      Array.isArray(cfg.colors));
    assert("roles defaults to array",       Array.isArray(cfg.roles));
    assert("themes defaults to array",      Array.isArray(cfg.themes) && cfg.themes.length > 0);
    assert("tokenNameSegments is array",     Array.isArray(cfg.tokenNameSegments));
  });

  // ── SECTION 7: variableMaker pipeline ────────────────────────────────────

  const _baseState = {
    scaleLength: 11,
    scaleAlgorithm: "Natural",
    pluginMode: "scale",
    useUniformAlgorithm: true,
    colors: [
      { name: "Primary", shorthand: "pr", value: "3B82F6", description: "" },
      { name: "Gray",    shorthand: "gr", value: "808080", description: "" },
    ],
    roles: [
      { name: "Text",       shorthand: "tx", minContrast: 4.5, mappingMethod: "contrast", variationTargets: [1.5, 3, 4.5, 7, 12] },
      { name: "Background", shorthand: "bg", minContrast: 1.2, mappingMethod: "contrast", variationTargets: [1.0, 1.1, 1.2, 1.35, 1.5] },
    ],
    themes: [
      { name: "Light", bg: "FFFFFF" },
      { name: "Dark",  bg: "1A1A2E" },
    ],
    variations: [
      { _id: "v1", name: "Default",  shorthand: "df" },
      { _id: "v2", name: "Subtle",   shorthand: "sb" },
      { _id: "v3", name: "Strong",   shorthand: "st" },
    ],
  };

  group("variableMaker — scale mode structure", () => {
    const result = variableMaker(translateConfig(_baseState));
    assert("no critical errors",         result.errors.critical.length === 0);
    assert("scales not empty",           Object.keys(result.scales).length === 2);
    assert("Primary scale exists",       !!result.scales["Primary"]);
    assert("Gray scale exists",          !!result.scales["Gray"]);
    const primaryScale = result.scales["Primary"];
    eq("Primary scale has 11 steps",     Object.keys(primaryScale).length, 11);

    assert("tokens has Light key", !!result.tokens["light"]);
    assert("tokens has Dark key",  !!result.tokens["dark"]);
    const lightPrimary = result.tokens["light"]["Primary"];
    assert("Light/Primary has roles",    lightPrimary && Object.keys(lightPrimary).length === 2);
  });

  group("variableMaker — scale mode token values", () => {
    const result = variableMaker(translateConfig(_baseState));
    const lightTokens = result.tokens["light"]["Primary"];
    Object.values(lightTokens).forEach((roleTokens) => {
      Object.values(roleTokens).forEach((token) => {
        assert(`token hex is valid: ${token.value}`, /^#[0-9A-Fa-f]{6}$/i.test(token.value));
        assert(`token has contrast ratio`,           typeof token.contrast.ratio === "number");
        assert(`token has tokenName`,                typeof token.tokenName === "string");
      });
    });
  });

  group("variableMaker — direct mode", () => {
    const directState = Object.assign({}, _baseState, { pluginMode: "direct" });
    const result = variableMaker(translateConfig(directState));
    assert("no critical errors",       result.errors.critical.length === 0);
    eq("scales is empty",              Object.keys(result.scales).length, 0);
    assert("tokens populated",         Object.keys(result.tokens).length === 2);
    const lightPrimary = result.tokens["light"]["Primary"];
    assert("tokens present",           lightPrimary && Object.keys(lightPrimary).length > 0);
    Object.values(lightPrimary).forEach((roleTokens) => {
      Object.values(roleTokens).forEach((token) => {
        assert(`direct token hex valid: ${token.value}`, /^#[0-9A-Fa-f]{6}$/i.test(token.value));
        const ratio = token.contrast.ratio;
        assert(`direct contrast is a number`, typeof ratio === "number" && ratio >= 1);
      });
    });
  });

  group("variableMaker — scale hex validity", () => {
    const result = variableMaker(translateConfig(_baseState));
    Object.entries(result.scales).forEach(([colorName, scale]) => {
      Object.entries(scale).forEach(([step, data]) => {
        assert(`${colorName}[${step}] is valid hex`, /^#[0-9A-Fa-f]{6}$/i.test(data.value));
        assert(`${colorName}[${step}] has contrast object`, typeof data.contrast === "object");
      });
    });
  });

  group("variableMaker — errors object shape", () => {
    const result = variableMaker(translateConfig(_baseState));
    assert("errors.critical is array",  Array.isArray(result.errors.critical));
    assert("errors.warnings is array",  Array.isArray(result.errors.warnings));
    assert("errors.notices is array",   Array.isArray(result.errors.notices));
  });

  // ── SECTION 8: normalizeSegment + segmentDepth ───────────────────────────

  group("normalizeSegment — malformed slash cleanup", () => {
    eq("trims whitespace around slashes",  normalizeSegment(" Brand / Primary "), "Brand/Primary");
    eq("collapses double slash",           normalizeSegment("Brand//Primary"),    "Brand/Primary");
    eq("strips leading slash",             normalizeSegment("/Primary"),           "Primary");
    eq("strips trailing slash",            normalizeSegment("Primary/"),           "Primary");
    eq("preserves intentional nesting",    normalizeSegment("Brand/Primary"),      "Brand/Primary");
    eq("flat name unchanged",             normalizeSegment("Primary"),            "Primary");
    eq("deep nesting preserved",           normalizeSegment("A/B/C"),              "A/B/C");
    eq("empty string passthrough",         normalizeSegment(""),                   "");
    eq("null passthrough",                 normalizeSegment(null),                 null);
  });

  group("segmentDepth", () => {
    eq("flat name → 1",           segmentDepth("Primary"),       1);
    eq("one slash → 2",           segmentDepth("Brand/Primary"), 2);
    eq("two slashes → 3",         segmentDepth("A/B/C"),         3);
    eq("leading slash ignored",   segmentDepth("/Primary"),      1);
    eq("trailing slash ignored",  segmentDepth("Primary/"),      1);
    eq("empty string → 1",        segmentDepth(""),              1);
    eq("null → 1",                segmentDepth(null),            1);
  });

  // ── SECTION 9: validateState — Figma name integrity ──────────────────────

  // Minimal valid state factory so each test only changes the thing under test.
  function _validState(overrides) {
    return Object.assign({
      colors:     [{ _id: "c1", name: "Primary",   shorthand: "pr", value: "3B82F6" }],
      roles:      [{ _id: "r1", name: "Text",       shorthand: "tx", minContrast: 4.5, mappingMethod: "contrast", variationTargets: [4.5], customVariationList: false, customVariations: [] }],
      variations: [{ _id: "v1", name: "Default",   shorthand: "df" }],
      themes:     [{ name: "Light", bg: "FFFFFF" }],
      useShorthandColors: false,
      useShorthandRoles:  false,
      useShorthandVariations: false,
    }, overrides);
  }

  group("validateState — empty names blocked", () => {
    // Temporarily point validateState at the test state by monkeypatching appState.
    // validateState() reads appState directly, so we swap it, call, then restore.
    const _saved = appState;

    appState = _validState({ colors: [{ _id: "c1", name: "", shorthand: "pr", value: "3B82F6" }] });
    assert("empty color name → issues array", Array.isArray(validateState()));

    appState = _validState({ roles: [{ _id: "r1", name: "", shorthand: "tx", minContrast: 4.5, mappingMethod: "contrast", variationTargets: [4.5], customVariationList: false, customVariations: [] }] });
    assert("empty role name → issues array", Array.isArray(validateState()));

    appState = _validState({ variations: [{ _id: "v1", name: "", shorthand: "df" }] });
    assert("empty variation name → issues array", Array.isArray(validateState()));

    appState = _validState();
    assert("all names present → null", validateState() === null);

    appState = _saved;
  });

  group("validateState — shorthand depth mismatch blocked", () => {
    const _saved = appState;

    // Color: name has 2 segments, shorthand has 1
    appState = _validState({ colors: [{ _id: "c1", name: "Brand/Primary", shorthand: "bp", value: "3B82F6" }] });
    assert("color: 2-segment name / 1-segment shorthand → issues", Array.isArray(validateState()));

    // Color: matching depths → ok
    appState = _validState({ colors: [{ _id: "c1", name: "Brand/Primary", shorthand: "br/pr", value: "3B82F6" }] });
    assert("color: 2-segment name / 2-segment shorthand → null", validateState() === null);

    // Role: mismatch
    appState = _validState({ roles: [{ _id: "r1", name: "UI/Text", shorthand: "tx", minContrast: 4.5, mappingMethod: "contrast", variationTargets: [4.5], customVariationList: false, customVariations: [] }] });
    assert("role: 2-segment name / 1-segment shorthand → issues", Array.isArray(validateState()));

    // Variation: mismatch
    appState = _validState({ variations: [{ _id: "v1", name: "State/Hover", shorthand: "hv" }] });
    assert("variation: 2-segment name / 1-segment shorthand → issues", Array.isArray(validateState()));

    // Flat name with no shorthand → always ok (no shorthand to mismatch)
    appState = _validState({ colors: [{ _id: "c1", name: "Primary", shorthand: "", value: "3B82F6" }] });
    assert("no shorthand → null", validateState() === null);

    appState = _saved;
  });

  group("validateState — resolved label collisions blocked", () => {
    const _saved = appState;

    // Two colors: different names, but same shorthand → collide when shorthand is on
    appState = _validState({
      colors: [
        { _id: "c1", name: "Primary", shorthand: "brand", value: "3B82F6" },
        { _id: "c2", name: "Secondary", shorthand: "brand", value: "EF4444" },
      ],
      useShorthandColors: true,
    });
    assert("two colors same shorthand (shorthand on) → issues", Array.isArray(validateState()));

    // Same setup, shorthand off → names are different → no collision
    appState = _validState({
      colors: [
        { _id: "c1", name: "Primary", shorthand: "brand", value: "3B82F6" },
        { _id: "c2", name: "Secondary", shorthand: "brand", value: "EF4444" },
      ],
      useShorthandColors: false,
    });
    assert("two colors same shorthand (shorthand off) → null", validateState() === null);

    // Color name matches another color's shorthand → collide when shorthand on
    appState = _validState({
      colors: [
        { _id: "c1", name: "brand", shorthand: "pr", value: "3B82F6" },
        { _id: "c2", name: "Secondary", shorthand: "brand", value: "EF4444" },
      ],
      useShorthandColors: true,
    });
    assert("name/shorthand cross-collision → issues", Array.isArray(validateState()));

    // Two roles same resolved label
    appState = _validState({
      roles: [
        { _id: "r1", name: "Text",    shorthand: "tx", minContrast: 4.5, mappingMethod: "contrast", variationTargets: [4.5], customVariationList: false, customVariations: [] },
        { _id: "r2", name: "Overlay", shorthand: "tx", minContrast: 4.5, mappingMethod: "contrast", variationTargets: [4.5], customVariationList: false, customVariations: [] },
      ],
      useShorthandRoles: true,
    });
    assert("two roles same shorthand (shorthand on) → issues", Array.isArray(validateState()));

    appState = _saved;
  });

  // ── SECTION 10: variableMaker output — Figma path integrity ──────────────

  group("variableMaker output — all token paths are non-empty strings", () => {
    const result = variableMaker(translateConfig(_baseState));
    let allNonEmpty = true;
    for (const theme of Object.keys(result.tokens)) {
      for (const roles of Object.values(result.tokens[theme])) {
        for (const roleTokens of Object.values(roles)) {
          for (const token of Object.values(roleTokens)) {
            if (!token.tokenName || typeof token.tokenName !== "string" || token.tokenName.trim() === "") {
              allNonEmpty = false;
            }
          }
        }
      }
    }
    assert("all tokenNames are non-empty strings", allNonEmpty);
  });

  group("variableMaker output — no duplicate tokenNames within a theme", () => {
    const result = variableMaker(translateConfig(_baseState));
    for (const theme of Object.keys(result.tokens)) {
      const seen = new Set();
      let hasDup = false;
      for (const roles of Object.values(result.tokens[theme])) {
        for (const roleTokens of Object.values(roles)) {
          for (const token of Object.values(roleTokens)) {
            if (seen.has(token.tokenName)) hasDup = true;
            seen.add(token.tokenName);
          }
        }
      }
      assert(`no duplicate tokenNames in theme "${theme}"`, !hasDup);
    }
  });

  group("variableMaker output — nested color names produce deeper token paths", () => {
    const nestedState = Object.assign({}, _baseState, {
      colors: [{ name: "Brand/Primary", shorthand: "br/pr", value: "3B82F6", description: "" }],
    });
    const result = variableMaker(translateConfig(nestedState));
    // tokenName should contain the full nested name
    const lightTokens = result.tokens["light"];
    const colorKey = Object.keys(lightTokens)[0];
    eq("nested color key preserved in token output", colorKey, "Brand/Primary");
    const firstRoleTokens = Object.values(lightTokens[colorKey])[0];
    const firstToken = Object.values(firstRoleTokens)[0];
    assert("tokenName includes nested color prefix", firstToken.tokenName.startsWith("Brand/Primary-"));
  });

  group("variableMaker output — shorthand variation count matches token slots per role", () => {
    const result = variableMaker(translateConfig(_baseState));
    const cfg = translateConfig(_baseState);
    const expectedVariationCount = cfg.variations.length;
    for (const theme of Object.keys(result.tokens)) {
      for (const [colorName, roles] of Object.entries(result.tokens[theme])) {
        for (const [roleId, roleTokens] of Object.entries(roles)) {
          const count = Object.keys(roleTokens).length;
          assert(
            `${theme}/${colorName}/role[${roleId}] has ${expectedVariationCount} token slots`,
            count === expectedVariationCount
          );
        }
      }
    }
  });

  group("variableMaker output — custom variation role produces correct slot count", () => {
    const customState = Object.assign({}, _baseState, {
      roles: [
        {
          name: "Text", shorthand: "tx", minContrast: 4.5, mappingMethod: "contrast",
          variationTargets: [3.0, 4.5, 7.0],
          customVariationList: true,
          customVariations: [
            { _id: "cv1", name: "Small", shorthand: "sm" },
            { _id: "cv2", name: "Large", shorthand: "lg" },
            { _id: "cv3", name: "XLarge", shorthand: "xl" },
          ],
        },
      ],
    });
    const result = variableMaker(translateConfig(customState));
    const lightTokens = result.tokens["light"]["Primary"];
    const roleTokens = lightTokens[0];
    eq("custom variation role produces 3 token slots", Object.keys(roleTokens).length, 3);
  });

  // ── SECTION 11: Material Design 3 — structural parity ───────────────────
  //
  // Ground truth: Material Design 3 published token specification.
  // Source: https://m3.material.io/foundations/design-tokens/overview
  // and the official M3 Figma community kit variable structure.
  //
  // This test passes the MATERIAL_PRESETS[0] config through the engine and
  // checks that every M3-specified token slot is present in the output.
  // Values are NOT checked here — only structural presence.
  //
  // M3 specifies these token families (Figma variable path format):
  //
  //   Scheme roles (× 4 key colors: Primary, Secondary, Tertiary, Error)
  //     Color/X - Scheme/X - Default        → primary / secondary / tertiary / error
  //     Color/X - Scheme/X - On             → onPrimary / onSecondary / …
  //     Color/X - Scheme/X - Container      → primaryContainer / …
  //     Color/X - Scheme/X - On Container   → onPrimaryContainer / …
  //
  //   Surface family (Neutral key color)
  //     Color/Neutral - Surface - Surface/Dim
  //     Color/Neutral - Surface - Surface/Default
  //     Color/Neutral - Surface - Surface/Bright
  //     Color/Neutral - Surface - Container/Lowest
  //     Color/Neutral - Surface - Container/Low
  //     Color/Neutral - Surface - Container/Default
  //     Color/Neutral - Surface - Container/High
  //     Color/Neutral - Surface - Container/Highest
  //
  //   On Surface (Neutral Variant key color)
  //     Color/Neutral Variant - On/Surface - Default   → onSurface
  //     Color/Neutral Variant - On/Surface - Variant   → onSurfaceVariant
  //
  //   Outline (Neutral Variant key color)
  //     Color/Neutral Variant - Outline - Default       → outline
  //     Color/Neutral Variant - Outline - Variant       → outlineVariant
  //
  //   Inverse surface (Neutral key color)
  //     Color/Neutral - Inverse/Surface - Surface       → inverseSurface
  //     Color/Neutral - Inverse/Surface - On Surface    → inverseOnSurface
  //     Color/Neutral - Inverse/Surface - Primary       → inversePrimary
  //
  //   Scrim + Shadow (Neutral key color)
  //     Color/Neutral - Scrim - Default                 → scrim
  //     Color/Neutral - Shadow - Default                → shadow
  //
  // Total expected token slots (unique paths, theme-independent): 33

  group("M3 structural parity — engine runs without critical errors", () => {
    const m3Config = MATERIAL_PRESETS[0].config;
    const translated = translateConfig(m3Config);
    const result = variableMaker(translated);

    assert("no critical errors", result.errors.critical.length === 0);
    assert("light theme present", !!result.tokens["light"]);
    assert("dark theme present",  !!result.tokens["dark"]);
    assert("scales generated",    Object.keys(result.scales).length > 0);
  });

  group("M3 structural parity — all 6 key color scales generated", () => {
    const result = variableMaker(translateConfig(MATERIAL_PRESETS[0].config));
    const scales = result.scales;

    eq("scale count is 6", Object.keys(scales).length, 6);
    assert("Color/Primary scale exists",          !!scales["Color/Primary"]);
    assert("Color/Secondary scale exists",        !!scales["Color/Secondary"]);
    assert("Color/Tertiary scale exists",         !!scales["Color/Tertiary"]);
    assert("Color/Error scale exists",            !!scales["Color/Error"]);
    assert("Color/Neutral scale exists",          !!scales["Color/Neutral"]);
    assert("Color/Neutral Variant scale exists",  !!scales["Color/Neutral Variant"]);

    // Each scale must have 25 steps (scaleLength: 25)
    for (const [name, scale] of Object.entries(scales)) {
      eq(`${name} scale has 25 steps`, Object.keys(scale).length, 25);
    }
  });

  group("M3 structural parity — scheme roles: 4 slots each for Primary Secondary Tertiary Error", () => {
    const result = variableMaker(translateConfig(MATERIAL_PRESETS[0].config));
    const light = result.tokens["light"];
    const dark  = result.tokens["dark"];

    // M3 scheme colors map to these 4 key colors
    const schemeColors = ["Color/Primary", "Color/Secondary", "Color/Tertiary", "Color/Error"];

    for (const colorName of schemeColors) {
      assert(`light has ${colorName}`, !!light[colorName]);
      assert(`dark has ${colorName}`,  !!dark[colorName]);

      const lightRoles = light[colorName];
      // Each scheme color has one role (Scheme/X) with 4 variations
      const roleKeys = Object.keys(lightRoles);
      eq(`${colorName} has exactly 1 role`, roleKeys.length, 1);

      const variationSlots = Object.keys(lightRoles[roleKeys[0]]);
      eq(`${colorName} role has 4 variation slots (Default/On/Container/On Container)`, variationSlots.length, 4);
    }
  });

  group("M3 structural parity — Surface role: 8 slots from Neutral", () => {
    const result = variableMaker(translateConfig(MATERIAL_PRESETS[0].config));
    const light = result.tokens["light"];

    assert("Color/Neutral in light tokens", !!light["Color/Neutral"]);
    const neutralRoles = light["Color/Neutral"];

    // Surface role should be one of the roles under Neutral
    // Find it by checking which role has 8 variation slots
    const surfaceRole = Object.values(neutralRoles).find(r => Object.keys(r).length === 8);
    assert("Surface role with 8 slots exists under Color/Neutral", !!surfaceRole);

    // All 8 slot indices 0–7 must exist
    if (surfaceRole) {
      for (let i = 0; i < 8; i++) {
        assert(`Surface slot ${i} exists`, surfaceRole[i] !== undefined);
      }
    }
  });

  group("M3 structural parity — On/Surface and Outline: 2 slots each from Neutral Variant", () => {
    const result = variableMaker(translateConfig(MATERIAL_PRESETS[0].config));
    const light = result.tokens["light"];

    assert("Color/Neutral Variant in light tokens", !!light["Color/Neutral Variant"]);
    const nvRoles = light["Color/Neutral Variant"];

    // 2 roles: On/Surface (2 slots) and Outline (2 slots)
    const roleEntries = Object.entries(nvRoles);
    eq("Neutral Variant has exactly 2 roles", roleEntries.length, 2);

    for (const [roleIdx, roleTokens] of roleEntries) {
      eq(`Neutral Variant role[${roleIdx}] has 2 variation slots`, Object.keys(roleTokens).length, 2);
    }
  });

  group("M3 structural parity — Inverse/Surface, Scrim, Shadow under Neutral", () => {
    const result = variableMaker(translateConfig(MATERIAL_PRESETS[0].config));
    const light = result.tokens["light"];
    const neutralRoles = light["Color/Neutral"];

    // Neutral has: Surface(8), Inverse/Surface(3), Scrim(1), Shadow(1) = 4 roles total
    const roleEntries = Object.entries(neutralRoles);
    eq("Color/Neutral has 4 roles", roleEntries.length, 4);

    const slotCounts = roleEntries.map(([, r]) => Object.keys(r).length).sort((a, b) => a - b);
    // Expected slot counts sorted: [1, 1, 3, 8]
    eq("slot counts: 1 (Scrim)",           slotCounts[0], 1);
    eq("slot counts: 1 (Shadow)",          slotCounts[1], 1);
    eq("slot counts: 3 (Inverse/Surface)", slotCounts[2], 3);
    eq("slot counts: 8 (Surface)",         slotCounts[3], 8);
  });

  group("M3 structural parity — total token count across both themes", () => {
    const result = variableMaker(translateConfig(MATERIAL_PRESETS[0].config));

    // Count tokens per theme
    function countTokens(themeTokens) {
      let n = 0;
      for (const colorRoles of Object.values(themeTokens)) {
        for (const roleSlots of Object.values(colorRoles)) {
          n += Object.keys(roleSlots).length;
        }
      }
      return n;
    }

    const lightCount = countTokens(result.tokens["light"]);
    const darkCount  = countTokens(result.tokens["dark"]);

    // Expected: 4 scheme colors × 4 slots = 16
    //         + Surface × 8 slots         =  8
    //         + On/Surface × 2 slots       =  2
    //         + Outline × 2 slots          =  2
    //         + Inverse/Surface × 3 slots  =  3
    //         + Scrim × 1 slot             =  1
    //         + Shadow × 1 slot            =  1
    //                                       = 33 tokens per theme
    eq("light theme has 33 tokens", lightCount, 33);
    eq("dark theme has 33 tokens",  darkCount,  33);
  });

  group("M3 structural parity — all token names are non-empty valid strings", () => {
    const result = variableMaker(translateConfig(MATERIAL_PRESETS[0].config));
    let allValid = true;
    for (const themeTokens of Object.values(result.tokens)) {
      for (const colorRoles of Object.values(themeTokens)) {
        for (const roleSlots of Object.values(colorRoles)) {
          for (const token of Object.values(roleSlots)) {
            if (!token.tokenName || typeof token.tokenName !== "string" || token.tokenName.trim() === "") {
              allValid = false;
              console.error("  M3 empty tokenName found:", JSON.stringify(token));
            }
          }
        }
      }
    }
    assert("all M3 token names are non-empty strings", allValid);
  });

  group("M3 structural parity — all token values are valid hex colors", () => {
    const result = variableMaker(translateConfig(MATERIAL_PRESETS[0].config));
    let allValid = true;
    for (const themeTokens of Object.values(result.tokens)) {
      for (const colorRoles of Object.values(themeTokens)) {
        for (const roleSlots of Object.values(colorRoles)) {
          for (const token of Object.values(roleSlots)) {
            if (!/^#[0-9A-Fa-f]{6}$/.test(token.value)) {
              allValid = false;
              console.error("  M3 invalid hex:", token.tokenName, token.value);
            }
          }
        }
      }
    }
    assert("all M3 token values are valid #RRGGBB hex", allValid);
  });

  group("M3 structural parity — no duplicate token names within a theme", () => {
    const result = variableMaker(translateConfig(MATERIAL_PRESETS[0].config));
    for (const [themeName, themeTokens] of Object.entries(result.tokens)) {
      const seen = new Set();
      let hasDup = false;
      for (const colorRoles of Object.values(themeTokens)) {
        for (const roleSlots of Object.values(colorRoles)) {
          for (const token of Object.values(roleSlots)) {
            if (seen.has(token.tokenName)) {
              hasDup = true;
              console.error(`  M3 duplicate in ${themeName}:`, token.tokenName);
            }
            seen.add(token.tokenName);
          }
        }
      }
      assert(`no duplicate token names in M3 ${themeName} theme`, !hasDup);
    }
  });

  group("M3 structural parity — scheme tokens meet contrast targets in light theme", () => {
    const result = variableMaker(translateConfig(MATERIAL_PRESETS[0].config));
    const light = result.tokens["light"];
    const schemeColors = ["Color/Primary", "Color/Secondary", "Color/Tertiary", "Color/Error"];

    // variation index 0 = Default (target 4.5:1 — WCAG AA)
    // variation index 1 = On     (target 14:1  — high contrast text on fill)
    // variation index 2 = Container (target 1.2:1 — low-contrast fill)
    // variation index 3 = On Container (target 10:1 — strong text on container)
    const targets = [4.5, 14.0, 1.2, 10.0];

    for (const colorName of schemeColors) {
      const roleSlots = Object.values(light[colorName])[0];
      for (let i = 0; i < 4; i++) {
        const token = roleSlots[i];
        if (token) {
          // Allow 0.3 ratio tolerance — engine finds nearest scale step
          const ratio = token.contrast.ratio;
          const target = targets[i];
          assert(
            `${colorName} slot[${i}] contrast ${ratio.toFixed(2)} ≥ ${target} (target)`,
            ratio >= target - 0.3
          );
        }
      }
    }
  });

  // ── SECTION 12: Atlassian Design System — structural parity ─────────────
  //
  // Ground truth: ADS published token reference.
  // Source: https://atlassian.design/components/tokens/all-tokens
  //
  // ADS token naming: color.[property].[semantic-role].[emphasis]
  //   property     = background | text | icon | border | link | blanket | skeleton
  //   semantic     = brand | neutral | success | warning | danger | information | discovery
  //   emphasis     = subtlest | subtle | default | bold | bolder (+ interaction states)
  //
  // Preset maps these as:
  //   Role    = ADS property  (Background, Text, Icon, Border, Link, Blanket, Skeleton)
  //   Color   = ADS semantic  (7 key colors)
  //   Variation = ADS emphasis (global 5-tier or per-role custom)
  //
  // Role inventory and their variation slot counts:
  //   Background            5 global variations  (Subtlest/Subtle/Default/Bold/Bolder)
  //   Background/Interaction 2 custom variations  (Hovered/Pressed)
  //   Text                  3 custom variations  (Subtlest/Default/Inverse)
  //   Icon                  2 custom variations  (Subtle/Default)
  //   Border                2 custom variations  (Subtle/Default)
  //   Link                  3 custom variations  (Default/Hovered/Pressed)
  //   Blanket               2 custom variations  (Default/Selected)
  //   Skeleton              2 custom variations  (Default/Subtle)
  //
  // Per color (7) × role slots:
  //   Background:             7 colors × 5 = 35
  //   Background/Interaction: 7 colors × 2 = 14
  //   Text:                   7 colors × 3 = 21
  //   Icon:                   7 colors × 2 = 14
  //   Border:                 7 colors × 2 = 14
  //   Link:                   7 colors × 3 = 21
  //   Blanket:                7 colors × 2 = 14
  //   Skeleton:               7 colors × 2 = 14
  //                                        = 147 tokens per theme

  group("ADS structural parity — engine runs without critical errors", () => {
    const adsCfg = ATLASSIAN_PRESETS[0].config;
    const result = variableMaker(translateConfig(adsCfg));

    assert("no critical errors",   result.errors.critical.length === 0);
    assert("light theme present",  !!result.tokens["light"]);
    assert("dark theme present",   !!result.tokens["dark"]);
    assert("scales generated",     Object.keys(result.scales).length > 0);
  });

  group("ADS structural parity — all 7 key color scales generated at 25 steps", () => {
    const result = variableMaker(translateConfig(ATLASSIAN_PRESETS[0].config));
    const scales = result.scales;

    eq("scale count is 7", Object.keys(scales).length, 7);
    assert("Color/Brand scale",       !!scales["Color/Brand"]);
    assert("Color/Neutral scale",     !!scales["Color/Neutral"]);
    assert("Color/Success scale",     !!scales["Color/Success"]);
    assert("Color/Warning scale",     !!scales["Color/Warning"]);
    assert("Color/Danger scale",      !!scales["Color/Danger"]);
    assert("Color/Information scale", !!scales["Color/Information"]);
    assert("Color/Discovery scale",   !!scales["Color/Discovery"]);

    for (const [name, scale] of Object.entries(scales)) {
      eq(`${name} has 25 steps`, Object.keys(scale).length, 25);
    }
  });

  group("ADS structural parity — 8 roles present per color in light theme", () => {
    const result = variableMaker(translateConfig(ATLASSIAN_PRESETS[0].config));
    const light = result.tokens["light"];

    const adsColors = [
      "Color/Brand", "Color/Neutral", "Color/Success",
      "Color/Warning", "Color/Danger", "Color/Information", "Color/Discovery",
    ];

    for (const colorName of adsColors) {
      assert(`light has ${colorName}`, !!light[colorName]);
      const roles = light[colorName];
      eq(`${colorName} has 8 roles`, Object.keys(roles).length, 8);
    }
  });

  group("ADS structural parity — Background role: 5 emphasis slots", () => {
    const result = variableMaker(translateConfig(ATLASSIAN_PRESETS[0].config));
    const light = result.tokens["light"];

    // Background uses global 5 variations → index 0 in role list
    // Find the role with 5 variation slots for Color/Brand
    const brandRoles = light["Color/Brand"];
    const bgRole = Object.values(brandRoles).find(r => Object.keys(r).length === 5);
    assert("Background role (5 slots) exists under Color/Brand", !!bgRole);
  });

  group("ADS structural parity — Text/Icon/Border/Link/Blanket/Skeleton custom slot counts", () => {
    const result = variableMaker(translateConfig(ATLASSIAN_PRESETS[0].config));
    const light = result.tokens["light"]["Color/Brand"];

    // Collect all slot-count values across roles for Color/Brand
    const slotCounts = Object.values(light).map(r => Object.keys(r).length).sort((a, b) => a - b);

    // Expected sorted: [2, 2, 2, 2, 2, 3, 3, 5]
    // → Interaction(2), Icon(2), Border(2), Blanket(2), Skeleton(2), Text(3), Link(3), Background(5)
    eq("slot counts[0] = 2", slotCounts[0], 2);
    eq("slot counts[1] = 2", slotCounts[1], 2);
    eq("slot counts[2] = 2", slotCounts[2], 2);
    eq("slot counts[3] = 2", slotCounts[3], 2);
    eq("slot counts[4] = 2", slotCounts[4], 2);
    eq("slot counts[5] = 3", slotCounts[5], 3);
    eq("slot counts[6] = 3", slotCounts[6], 3);
    eq("slot counts[7] = 5", slotCounts[7], 5);
  });

  group("ADS structural parity — total token count per theme", () => {
    const result = variableMaker(translateConfig(ATLASSIAN_PRESETS[0].config));

    function countTokens(themeTokens) {
      let n = 0;
      for (const colorRoles of Object.values(themeTokens)) {
        for (const roleSlots of Object.values(colorRoles)) {
          n += Object.keys(roleSlots).length;
        }
      }
      return n;
    }

    // 7 colors × (5 + 2 + 3 + 2 + 2 + 3 + 2 + 2) = 7 × 21 = 147
    eq("light theme has 147 tokens", countTokens(result.tokens["light"]), 147);
    eq("dark theme has 147 tokens",  countTokens(result.tokens["dark"]),  147);
  });

  group("ADS structural parity — all token names are valid non-empty strings", () => {
    const result = variableMaker(translateConfig(ATLASSIAN_PRESETS[0].config));
    let allValid = true;
    for (const themeTokens of Object.values(result.tokens)) {
      for (const colorRoles of Object.values(themeTokens)) {
        for (const roleSlots of Object.values(colorRoles)) {
          for (const token of Object.values(roleSlots)) {
            if (!token.tokenName || typeof token.tokenName !== "string" || token.tokenName.trim() === "") {
              allValid = false;
              console.error("  ADS empty tokenName:", JSON.stringify(token));
            }
          }
        }
      }
    }
    assert("all ADS token names are non-empty strings", allValid);
  });

  group("ADS structural parity — all token values are valid hex colors", () => {
    const result = variableMaker(translateConfig(ATLASSIAN_PRESETS[0].config));
    let allValid = true;
    for (const themeTokens of Object.values(result.tokens)) {
      for (const colorRoles of Object.values(themeTokens)) {
        for (const roleSlots of Object.values(colorRoles)) {
          for (const token of Object.values(roleSlots)) {
            if (!/^#[0-9A-Fa-f]{6}$/.test(token.value)) {
              allValid = false;
              console.error("  ADS invalid hex:", token.tokenName, token.value);
            }
          }
        }
      }
    }
    assert("all ADS token values are valid #RRGGBB hex", allValid);
  });

  group("ADS structural parity — no duplicate token names within a theme", () => {
    const result = variableMaker(translateConfig(ATLASSIAN_PRESETS[0].config));
    for (const [themeName, themeTokens] of Object.entries(result.tokens)) {
      const seen = new Set();
      let hasDup = false;
      for (const colorRoles of Object.values(themeTokens)) {
        for (const roleSlots of Object.values(colorRoles)) {
          for (const token of Object.values(roleSlots)) {
            if (seen.has(token.tokenName)) {
              hasDup = true;
              console.error(`  ADS duplicate in ${themeName}:`, token.tokenName);
            }
            seen.add(token.tokenName);
          }
        }
      }
      assert(`no duplicate token names in ADS ${themeName} theme`, !hasDup);
    }
  });

  group("ADS structural parity — text tokens meet minimum contrast in light theme", () => {
    const result = variableMaker(translateConfig(ATLASSIAN_PRESETS[0].config));
    const light = result.tokens["light"];
    const adsColors = ["Color/Brand", "Color/Success", "Color/Danger"];

    for (const colorName of adsColors) {
      const colorRoles = light[colorName];
      // Find Text role (3 custom slots)
      const textRole = Object.values(colorRoles).find(r => Object.keys(r).length === 3);
      if (textRole) {
        // slot 0 = Subtlest (target 3:1), slot 1 = Default (target 7:1)
        const subtlest = textRole[0];
        const deflt    = textRole[1];
        if (subtlest) assert(`${colorName} Text/Subtlest ≥ 3:1 contrast`, subtlest.contrast.ratio >= 2.7);
        if (deflt)    assert(`${colorName} Text/Default ≥ 7:1 contrast`,  deflt.contrast.ratio >= 6.7);
      }
    }
  });

  // ── SUMMARY ──────────────────────────────────────────────────────────────

  console.group("Token Wand — Test Results");
  _groups.forEach(({ name, p, f }) => {
    const icon = f === 0 ? "✓" : "✗";
    const log = f === 0 ? console.log : console.error;
    log(`  ${icon}  ${name}  (${p} passed${f ? ", " + f + " failed" : ""})`);
  });
  console.log("");
  if (_failed === 0) {
    console.log(`%c  All ${_passed} tests passed`, "color:green;font-weight:bold");
  } else {
    console.error(`  ${_passed} passed, ${_failed} FAILED`);
  }
  console.groupEnd();
})();
