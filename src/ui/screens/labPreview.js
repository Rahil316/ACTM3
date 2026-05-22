/**
 * ============================================================================
 * Token Wand BETA LAB — labPreview.js
 * Variant B redesign of the preview theme panel.
 * Rendered into #design-lab-overlay via betaLab.js.
 *
 * Design goals:
 *  - Modern tiles: each token is a self-contained card, not a bare swatch
 *  - Self-explaining: token name, hex, WCAG rating, and contrast ratio all
 *    visible without hover gymnastics
 *  - Structure mirrors output: Color → Role → Variation hierarchy is explicit
 *  - No palette duplication: scales live in the Palette tab; theme panel is
 *    purely about semantic tokens and their contrast story
 *  - Customisation-first: density toggle (comfortable / compact), copy target
 *    (hex vs token name) toggle, optional token name visibility
 * ============================================================================
 */

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const LAB_RATING_META = {
  AAA:        { label: "AAA",   bg: "#22c55e", fg: "#fff" },
  AA:         { label: "AA",    bg: "#3b82f6", fg: "#fff" },
  "AA Large": { label: "AA Lg", bg: "#f59e0b", fg: "#fff" },
  Fail:       { label: "Fail",  bg: "#ef4444", fg: "#fff" },
};

// ── LAB STATE (persists across re-renders within the session) ─────────────────

const _labState = {
  density: "comfortable",  // "comfortable" | "compact"
  showTokenName: true,
  activeTheme: 0,
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

function _labRatingMeta(rating) {
  return LAB_RATING_META[rating] || LAB_RATING_META["Fail"];
}

function _labVarLabel(varKey) {
  const i = parseInt(varKey);
  if (!isNaN(i) && appState.variations && appState.variations[i]) {
    const v = appState.variations[i];
    return v.name || v.shorthand || `Var ${i}`;
  }
  return varKey;
}

function _labRoleName(roleIdx) {
  return (appState.roles[roleIdx] && appState.roles[roleIdx].name) || `Role ${roleIdx}`;
}

function _labScopeLabel(roleIdx) {
  const role = appState.roles[roleIdx];
  if (!role) return null;
  const s = role.scope || "all";
  if (s === "all") return null;
  return s;
}

// ── TOKEN TILE ────────────────────────────────────────────────────────────────

function _labTokenTile(token, varLabel, ink) {
  const isCompact  = _labState.density === "compact";
  const swatchH    = isCompact ? "52px" : "80px";
  const meta       = _labRatingMeta(token.contrast?.rating);
  const ratio      = typeof token.contrast?.ratio === "number"
    ? token.contrast.ratio.toFixed(1) : "—";

  const inkRgb     = ink;
  const swatchInk  = useWhiteLabel(token.value) ? "255,255,255" : "0,0,0";
  const swatchInkStr = `rgb(${swatchInk})`;

  // ── Rating pill — opaque, always visible, top-right
  const ratingPill = el("div", {
    style: [
      `background:${meta.bg}`,
      `color:${meta.fg}`,
      "font-size:9px",
      "font-weight:800",
      "letter-spacing:0.07em",
      "padding:2px 6px",
      "border-radius:5px",
      "line-height:1.5",
      "white-space:nowrap",
    ].join(";"),
  }, meta.label);

  // ── Contrast ratio — hero number, bottom-left, big and bold
  const ratioDisplay = el("div", {
    style: [
      "display:flex",
      "align-items:baseline",
      "gap:2px",
    ].join(";"),
  }, [
    el("span", {
      style: [
        "font-size:20px",
        "font-weight:800",
        "font-variant-numeric:tabular-nums",
        "line-height:1",
        `color:${swatchInkStr}`,
        "text-shadow:0 1px 4px rgba(0,0,0,0.20)",
      ].join(";"),
    }, ratio),
    el("span", {
      style: [
        "font-size:10px",
        "font-weight:700",
        "opacity:0.7",
        `color:${swatchInkStr}`,
        "margin-bottom:1px",
      ].join(";"),
    }, ":1"),
  ]);

  // ── Hex overlay — hidden by default, revealed on hover
  const hexOverlay = el("div", {
    style: [
      "position:absolute",
      "inset:0",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "border-radius:10px 10px 0 0",
      "opacity:0",
      "transition:opacity 0.15s ease",
      "pointer-events:none",
      "backdrop-filter:blur(2px)",
      "-webkit-backdrop-filter:blur(2px)",
      "background:rgba(0,0,0,0.18)",
    ].join(";"),
  }, [
    el("span", {
      style: [
        "font-size:12px",
        "font-family:ui-monospace,SFMono-Regular,Menlo,monospace",
        "font-weight:700",
        "color:#fff",
        "letter-spacing:0.06em",
        "text-shadow:0 1px 4px rgba(0,0,0,0.5)",
      ].join(";"),
    }, token.value.toUpperCase()),
  ]);

  // ── Upper swatch — click copies hex
  const swatch = el("div", {
    style: [
      `background:${token.value}`,
      `height:${swatchH}`,
      "border-radius:10px 10px 0 0",
      "position:relative",
      "padding:6px",
      "display:flex",
      "flex-direction:column",
      "justify-content:space-between",
      "cursor:pointer",
      "transition:transform 0.12s ease,box-shadow 0.12s ease",
      "overflow:hidden",
    ].join(";"),
    title: `${token.value.toUpperCase()} — click to copy hex`,
    onclick: () => {
      copyToClipboard(token.value);
      ToastManager.success(`Copied ${token.value.toUpperCase()}`);
    },
    onmouseenter: (e) => {
      e.currentTarget.style.transform = "scale(1.03)";
      e.currentTarget.style.boxShadow = `0 8px 24px rgba(${swatchInk},0.25)`;
      hexOverlay.style.opacity = "1";
    },
    onmouseleave: (e) => {
      e.currentTarget.style.transform = "";
      e.currentTarget.style.boxShadow = "";
      hexOverlay.style.opacity = "0";
    },
  }, [
    el("div", { style: "display:flex;justify-content:flex-end" }, [ratingPill]),
    ratioDisplay,
    hexOverlay,
  ]);

  // ── Variation label
  const varLine = el("div", {
    style: [
      "font-size:11px",
      "font-weight:600",
      `color:rgba(${inkRgb},0.80)`,
      "line-height:1.2",
      "white-space:nowrap",
      "overflow:hidden",
      "text-overflow:ellipsis",
    ].join(";"),
  }, varLabel);

  // ── Token name — toggleable, sits below var label
  const tokenNameLine = _labState.showTokenName && token.tokenName
    ? el("div", {
        style: [
          "font-size:9px",
          `color:rgba(${inkRgb},0.40)`,
          "letter-spacing:0.03em",
          "line-height:1.3",
          "overflow:hidden",
          "text-overflow:ellipsis",
          "white-space:nowrap",
        ].join(";"),
      }, token.tokenName)
    : null;

  // ── Lower footer — click copies token name
  const footerChildren = [varLine];
  if (tokenNameLine) footerChildren.push(tokenNameLine);

  const footer = el("div", {
    style: [
      "padding:6px 8px 8px",
      "display:flex",
      "flex-direction:column",
      "gap:3px",
      `border:1px solid rgba(${inkRgb},0.10)`,
      "border-top:none",
      "border-radius:0 0 10px 10px",
      `background:rgba(${inkRgb},0.04)`,
      token.tokenName ? "cursor:pointer" : "",
      "transition:background 0.12s ease",
    ].join(";"),
    title: token.tokenName ? `${token.tokenName} — click to copy token name` : undefined,
    onclick: token.tokenName
      ? () => { copyToClipboard(token.tokenName); ToastManager.success(`Copied ${token.tokenName}`); }
      : undefined,
    onmouseenter: token.tokenName
      ? (e) => { e.currentTarget.style.background = `rgba(${inkRgb},0.09)`; }
      : undefined,
    onmouseleave: token.tokenName
      ? (e) => { e.currentTarget.style.background = `rgba(${inkRgb},0.04)`; }
      : undefined,
  }, footerChildren);

  return el("div", {
    style: "display:flex;flex-direction:column;min-width:0",
  }, [swatch, footer]);
}

// ── ROLE BLOCK ────────────────────────────────────────────────────────────────

function _labRoleBlock(roleIdx, variations, bgHex, ink, result) {
  const rName     = _labRoleName(roleIdx);
  const scopeLabel= _labScopeLabel(roleIdx);

  const headerLeft = el("div", {
    style: "display:flex;align-items:center;gap:6px;min-width:0",
  }, [
    el("div", {
      style: [
        "font-size:12px",
        "font-weight:700",
        `color:rgba(${ink},0.90)`,
        "letter-spacing:0.01em",
        "white-space:nowrap",
        "overflow:hidden",
        "text-overflow:ellipsis",
      ].join(";"),
    }, rName),
    ...(scopeLabel ? [el("div", {
      style: [
        "font-size:9px",
        "font-weight:700",
        "letter-spacing:0.08em",
        "text-transform:uppercase",
        `color:rgba(${ink},0.45)`,
        `border:1px solid rgba(${ink},0.18)`,
        "border-radius:4px",
        "padding:1px 5px",
        "line-height:1.5",
        "white-space:nowrap",
      ].join(";"),
    }, scopeLabel)] : []),
  ]);

  const varCount = Object.keys(variations).length;
  const colSize  = _labState.density === "compact" ? "80px" : "96px";
  const grid     = el("div", {
    style: `display:grid;grid-template-columns:repeat(auto-fill,minmax(${colSize},1fr));gap:8px`,
  });

  for (const [varKey, token] of Object.entries(variations)) {
    grid.appendChild(_labTokenTile(token, _labVarLabel(varKey), ink));
  }

  return el("div", {
    style: "display:flex;flex-direction:column;gap:8px",
  }, [headerLeft, grid]);
}

// ── COLOR SECTION ─────────────────────────────────────────────────────────────

function _labColorSection(colorName, roles, bgHex, ink, result) {
  const colorEntry = appState.colors.find((c) => c.name === colorName);
  const swatchHex  = colorEntry ? "#" + colorEntry.value.replace(/^#/, "") : "#888888";

  const header = el("div", {
    style: "display:flex;align-items:center;gap:8px;margin-bottom:12px",
  }, [
    el("div", {
      style: [
        `background:${swatchHex}`,
        "width:12px",
        "height:12px",
        "border-radius:3px",
        "flex-shrink:0",
        `box-shadow:0 0 0 1px rgba(${ink},0.12)`,
      ].join(";"),
    }),
    el("div", {
      style: [
        "font-size:13px",
        "font-weight:700",
        `color:rgba(${ink},1)`,
        "letter-spacing:0.005em",
      ].join(";"),
    }, colorName),
  ]);

  const rolesEl = el("div", { style: "display:flex;flex-direction:column;gap:16px" });
  for (const [roleIdx, variations] of Object.entries(roles)) {
    rolesEl.appendChild(_labRoleBlock(roleIdx, variations, bgHex, ink, result));
  }

  return el("div", {
    style: [
      `border:1px solid rgba(${ink},0.10)`,
      "border-radius:14px",
      "padding:16px",
      `background:rgba(${ink},0.03)`,
    ].join(";"),
  }, [header, rolesEl]);
}

// ── DENSITY / OPTION TOGGLES ─────────────────────────────────────────────────

function _labToolbar(onRefresh) {
  function segBtn(label, active, onclick) {
    return el("button", {
      style: [
        "font-size:11px",
        "font-weight:600",
        "padding:3px 10px",
        "border-radius:6px",
        "border:none",
        "cursor:pointer",
        "transition:all 0.12s",
        active
          ? "background:var(--accent);color:#fff"
          : "background:var(--bg-input);color:var(--text-muted)",
      ].join(";"),
      onclick,
    }, label);
  }

  function toggleBtn(label, active, onclick) {
    return el("button", {
      style: [
        "font-size:11px",
        "font-weight:600",
        "padding:3px 10px",
        "border-radius:6px",
        "border:none",
        "cursor:pointer",
        "transition:all 0.12s",
        active
          ? "background:var(--accent);color:#fff"
          : "background:var(--bg-input);color:var(--text-muted)",
      ].join(";"),
      onclick,
    }, label);
  }

  const densityLabel = el("span", {
    style: "font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);white-space:nowrap",
  }, "Density");

  const densityGroup = el("div", {
    style: "display:flex;align-items:center;gap:3px",
  }, [
    densityLabel,
    el("div", { style: "width:8px" }),
    segBtn("Comfortable", _labState.density === "comfortable", () => {
      _labState.density = "comfortable"; onRefresh();
    }),
    segBtn("Compact", _labState.density === "compact", () => {
      _labState.density = "compact"; onRefresh();
    }),
  ]);

  // Copy hint — explains the two-zone interaction
  const copyHint = el("div", {
    style: "font-size:10px;color:var(--text-muted);letter-spacing:0.01em",
  }, "Swatch → copy hex · Label → copy token");

  const tokenToggle = toggleBtn(
    "Token Names",
    _labState.showTokenName,
    () => { _labState.showTokenName = !_labState.showTokenName; onRefresh(); },
  );

  return el("div", {
    style: [
      "display:flex",
      "align-items:center",
      "gap:12px",
      "flex-wrap:wrap",
      "padding:8px 16px",
      "border-bottom:1px solid var(--border)",
      "background:var(--bg-app)",
      "flex-shrink:0",
    ].join(";"),
  }, [densityGroup, copyHint, el("div", { style: "margin-left:auto" }, [tokenToggle])]);
}

// ── THEME TAB BAR ─────────────────────────────────────────────────────────────

function _labThemeTabBar(themes, onSelect) {
  const bar = el("div", {
    style: [
      "display:flex",
      "align-items:center",
      "gap:6px",
      "padding:10px 16px 0",
      "border-bottom:1px solid var(--border)",
      "background:var(--bg-app)",
      "flex-shrink:0",
    ].join(";"),
  });

  themes.forEach((theme, i) => {
    const isActive = i === _labState.activeTheme;
    const btn = el("button", {
      style: [
        "font-size:13px",
        "font-weight:600",
        "padding:6px 14px",
        "border:none",
        "border-radius:8px 8px 0 0",
        "cursor:pointer",
        "transition:all 0.12s",
        "border-bottom:2px solid transparent",
        isActive
          ? "color:var(--accent);border-bottom-color:var(--accent);background:var(--bg-hover)"
          : "color:var(--text-muted);background:transparent",
      ].join(";"),
      onclick: () => { _labState.activeTheme = i; onSelect(); },
    }, theme.name || `Theme ${i + 1}`);
    bar.appendChild(btn);
  });

  return bar;
}

// ── THEME CANVAS (single theme panel) ────────────────────────────────────────

function _labThemeCanvas(themeTokens, bgHex, ink, result) {
  const canvas = el("div", {
    style: [
      `background:${bgHex}`,
      "flex:1",
      "overflow-y:auto",
      "padding:20px 16px 32px",
      "display:flex",
      "flex-direction:column",
      "gap:16px",
    ].join(";"),
  });

  canvas.style.setProperty("--pv-text",   `rgb(${ink})`);
  canvas.style.setProperty("--pv-muted",  `rgba(${ink},0.55)`);
  canvas.style.setProperty("--pv-border", `rgba(${ink},0.12)`);

  const colors = Object.entries(themeTokens);
  if (colors.length === 0) {
    canvas.appendChild(el("div", {
      style: `color:rgba(${ink},0.45);font-size:13px;text-align:center;padding:48px 0`,
    }, "No tokens for this theme."));
    return canvas;
  }

  for (const [colorName, roles] of colors) {
    canvas.appendChild(_labColorSection(colorName, roles, bgHex, ink, result));
  }

  return canvas;
}

// ── MAIN RENDERER ─────────────────────────────────────────────────────────────

function renderLabPreview() {
  const overlay = document.getElementById("design-lab-overlay");
  if (!overlay) return;

  let result;
  try {
    result = variableMaker(translateConfig(appState));
  } catch (err) {
    overlay.innerHTML = `<div style="padding:32px;color:var(--text-muted);font-size:13px">Preview error: ${err.message}</div>`;
    return;
  }

  const themes = appState.themes || [];
  overlay.innerHTML = "";

  // Header
  const header = el("div", {
    style: [
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "padding:0 16px",
      "height:52px",
      "border-bottom:1px solid var(--border)",
      "background:var(--bg-app)",
      "flex-shrink:0",
    ].join(";"),
  }, [
    el("div", { style: "display:flex;align-items:center;gap:8px" }, [
      el("span", { style: "font-size:16px" }, "⚗"),
      el("div", { style: "font-size:14px;font-weight:700;color:var(--text-primary)" }, "Design Lab"),
      el("div", {
        style: [
          "font-size:10px","font-weight:700","letter-spacing:0.08em","text-transform:uppercase",
          "color:var(--accent)","background:rgba(var(--accent-rgb,99,102,241),0.12)",
          "border-radius:4px","padding:2px 6px",
        ].join(";"),
      }, "Beta"),
    ]),
    el("button", {
      style: [
        "font-size:12px","font-weight:600","padding:5px 12px",
        "border-radius:8px","border:1px solid var(--border)",
        "background:var(--bg-input)","color:var(--text-muted)","cursor:pointer",
      ].join(";"),
      onclick: () => hideOverlay("design-lab-overlay"),
    }, "Close"),
  ]);

  overlay.appendChild(header);

  if (themes.length === 0) {
    overlay.appendChild(el("div", {
      style: "padding:48px;text-align:center;color:var(--text-muted);font-size:13px",
    }, "Add a theme in Settings to preview tokens here."));
    return;
  }

  // Clamp active theme index
  if (_labState.activeTheme >= themes.length) _labState.activeTheme = 0;

  function rebuild() {
    // Remove everything after the fixed header
    while (overlay.children.length > 1) overlay.lastChild.remove();
    renderLabBody();
  }

  function renderLabBody() {
    const toolbar   = _labToolbar(rebuild);
    const tabBar    = _labThemeTabBar(themes, rebuild);
    overlay.appendChild(toolbar);
    overlay.appendChild(tabBar);

    const theme   = themes[_labState.activeTheme];
    const bgHex   = normalizeHex(theme.bg) || "#FFFFFF";
    const inkRgb  = useWhiteLabel(bgHex) ? "255,255,255" : "0,0,0";
    const tokens  = result.tokens[theme.name.toLowerCase()] || {};

    overlay.appendChild(_labThemeCanvas(tokens, bgHex, inkRgb, result));
  }

  renderLabBody();
}
