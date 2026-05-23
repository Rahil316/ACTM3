/**
 * ============================================================================
 * Token Wand SCREEN: PREVIEW
 * Renders the color scale + theme token swatches in the preview panel.
 * Also owns the dynamic theme tab bar.
 * ============================================================================
 */

// ── COLOR SCALE COMPONENTS ────────────────────────────────────────────────────

function _pvScaleStep(step, data, onHover) {
  const labelEl = el(
    "div",
    {
      class: "absolute inset-0 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
      style: `color:${useWhiteLabel(data.value) ? "#fff" : "#000"}`,
    },
    [el("span", { class: "text-[12px] font-bold leading-none" }, step), el("span", { class: "text-[14px] font-mono leading-none opacity-80" }, data.value)],
  );
  const stepEl = el(
    "div",
    {
      class: "preview-swatch group relative flex-1 h-full hover:flex-[4] hover:z-10 hover:rounded-[8px] transition-all cursor-pointer",
      style: `background:${data.value}`,
      title: `${step} · ${data.value} — click to copy`,
      onclick: () => {
        copyToClipboard(data.value);
        ToastManager.success(`Copied ${data.value}`);
      },
    },
    [labelEl],
  );
  stepEl.onmouseenter = () => onHover(data.value, step, data.contrast || {});
  return stepEl;
}

function _pvColorScaleRow(colorName, colorIdx, srcHex, scale, themeKeys) {
  const hexDisplay = el("span", { class: "text-[12px] font-bold font-mono" });
  const stepName = el("span", { class: "text-[12px] font-bold" });
  const numDisplay = el("span", { class: "text-[12px] text-[var(--text-muted)] font-mono" });
  const infoDisplay = el("span", { class: "ml-auto text-[12px] text-[var(--text-muted)]" });

  const swatchDiv = el("div", {
    class: "size-8 rounded-md shrink-0",
    style: `background:${srcHex}`,
    title: "Click to edit source color",
  });
  const pickerInput = el("input", {
    type: "color",
    value: srcHex,
    class: "absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10",
    title: "Click to edit color",
    oninput: (e) => {
      const clean = e.target.value.replace("#", "").toUpperCase();
      if (colorIdx >= 0) {
        updateGroup(colorIdx, "value", clean);
        swatchDiv.style.background = "#" + clean;
      }
    },
  });
  const swatchWrap = el("div", { class: "relative size-8 shrink-0 cursor-pointer", title: "Click to edit color" }, [pickerInput, swatchDiv]);

  const spectrum = el("div", {
    class: "col-span-3 flex w-full h-20 rounded-[10px] overflow-hidden cursor-crosshair",
    style: "box-shadow:0 10px 30px #0000001f;border:1px solid #8888881A",
  });
  for (const [step, data] of Object.entries(scale)) {
    spectrum.appendChild(
      _pvScaleStep(step, data, (hex, s, contrast) => {
        hexDisplay.textContent = hex;
        hexDisplay.style.color = hex;
        numDisplay.textContent = s;
        stepName.textContent = data.stepName;
        infoDisplay.textContent = themeKeys
          .map((k) => (contrast[k] ? `${k}: ${contrast[k].ratio}` : ""))
          .filter(Boolean)
          .join(" · ");
      }),
    );
  }

  return el("div", { class: "grid items-center gap-2 mb-3", style: "grid-template-columns:32px 1fr auto;grid-template-rows:32px auto" }, [
    swatchWrap,
    el("div", { class: "text-[12px] font-bold text-[var(--text-primary)]" }, colorName),
    el("div", { class: "flex items-center gap-2" }, [stepName, infoDisplay]),
    spectrum,
  ]);
}

// ── ALPHA TINT COMPONENTS ─────────────────────────────────────────────────────

function _pvAlphaTintStrip(color, alphaInts) {
  const hex = "#" + color.value.replace(/^#/, "").toUpperCase().padEnd(6, "0");
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const swatches = alphaInts.map((opacity) => {
    const a = (opacity / 100).toFixed(2);
    const rgbaStr = `rgba(${r},${g},${b},${a})`;
    return el("div", {
      class: "flex-1 h-6 rounded cursor-pointer",
      style: `background:${rgbaStr};box-shadow:inset 0 0 0 1px rgba(128,128,128,.2)`,
      title: `${color.name} ${opacity}%\n${rgbaStr}`,
      onclick: () => {
        copyToClipboard(rgbaStr);
        ToastManager.success(`Copied ${rgbaStr}`);
      },
    });
  });
  return el("div", { class: "flex gap-0.5 items-center mb-1.5" }, [
    el("div", { class: "w-16 text-[11px] text-[var(--text-muted)] truncate shrink-0", title: color.name }, color.name),
    ...swatches,
  ]);
}

// ── THEME TOKEN COMPONENTS ────────────────────────────────────────────────────

// WCAG rating → opaque pill style (solid bg, always legible)
const _PV_RATING = {
  AAA: { label: "AAA", bg: "#22c55e", fg: "#fff" },
  AA: { label: "AA", bg: "#3b82f6", fg: "#fff" },
  "AA Large": { label: "AA Lg", bg: "#f59e0b", fg: "#fff" },
  Fail: { label: "Fail", bg: "#ef4444", fg: "#fff" },
};

// Session-level preview prefs — survive tab switches, reset on page reload
const _pvState = {
  groupBy: "color", // "color" | "role"
  viewMode: "grid", // "grid"  | "table"
};

function _pvVarLabel(varKey) {
  const i = parseInt(varKey);
  if (!isNaN(i) && appState.variations && appState.variations[i]) {
    return appState.variations[i].name || appState.variations[i].shorthand;
  }
  return varKey;
}

// Two-zone token tile card.
// Upper zone (swatch) → click copies hex.
// Lower zone (footer) → click copies token name.
function _pvTokenTile(token, varLabel, ink) {
  const rMeta = _PV_RATING[token.contrast?.rating] || _PV_RATING["Fail"];
  const ratio = typeof token.contrast?.ratio === "number" ? token.contrast.ratio.toFixed(1) : "—";
  const swatchInk = useWhiteLabel(token.value) ? "255,255,255" : "0,0,0";
  const swatchInkStr = `rgb(${swatchInk})`;

  // Rating pill — top-right, opaque, always visible
  const ratingPill = el(
    "div",
    {
      style: [
        `background:${rMeta.bg}`,
        `color:${rMeta.fg}`,
        "font-size:9px",
        "font-weight:800",
        "letter-spacing:0.07em",
        "padding:2px 6px",
        "border-radius:5px",
        "line-height:1.5",
        "white-space:nowrap",
      ].join(";"),
    },
    rMeta.label,
  );

  // Contrast ratio — hero number, bottom-left
  const ratioEl = el(
    "div",
    {
      style: "display:flex;align-items:baseline;gap:2px",
    },
    [
      el(
        "span",
        {
          style: [
            "font-size:20px",
            "font-weight:800",
            "font-variant-numeric:tabular-nums",
            "line-height:1",
            `color:${swatchInkStr}`,
            "text-shadow:0 1px 4px rgba(0,0,0,0.20)",
          ].join(";"),
        },
        ratio,
      ),
      el(
        "span",
        {
          style: ["font-size:10px", "font-weight:700", "opacity:0.7", `color:${swatchInkStr}`, "margin-bottom:1px"].join(";"),
        },
        ":1",
      ),
    ],
  );

  // Hex overlay — revealed on hover over swatch
  const hexOverlay = el(
    "div",
    {
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
        "background:rgba(0,0,0,0.18)",
      ].join(";"),
    },
    [
      el(
        "span",
        {
          style: [
            "font-size:12px",
            "font-family:ui-monospace,SFMono-Regular,Menlo,monospace",
            "font-weight:700",
            "color:#fff",
            "letter-spacing:0.06em",
            "text-shadow:0 1px 4px rgba(0,0,0,0.5)",
          ].join(";"),
        },
        token.value.toUpperCase(),
      ),
    ],
  );

  // Upper swatch zone — click copies hex
  const swatch = el(
    "div",
    {
      style: [
        `background:${token.value}`,
        "height:72px",
        "border-radius:10px 10px 0 0",
        "position:relative",
        "padding:6px",
        "display:flex",
        "flex-direction:column",
        "justify-content:space-between",
        "cursor:pointer",
        "overflow:hidden",
        "transition:transform 0.12s ease,box-shadow 0.12s ease",
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
    },
    [el("div", { style: "display:flex;justify-content:flex-end" }, [ratingPill]), ratioEl, hexOverlay],
  );

  // Variation label
  const varLine = el(
    "div",
    {
      style: [
        "font-size:11px",
        "font-weight:600",
        `color:rgba(${ink},0.80)`,
        "line-height:1.2",
        "white-space:nowrap",
        "overflow:hidden",
        "text-overflow:ellipsis",
      ].join(";"),
    },
    varLabel,
  );

  // Token name — always shown in grid view
  const tokenNameEl = token.tokenName
    ? el(
        "div",
        {
          style: [
            "font-size:9px",
            `color:rgba(${ink},0.40)`,
            "letter-spacing:0.03em",
            "line-height:1.3",
            "overflow:hidden",
            "text-overflow:ellipsis",
            "white-space:nowrap",
          ].join(";"),
        },
        token.tokenName,
      )
    : null;

  const footerChildren = [varLine];
  if (tokenNameEl) footerChildren.push(tokenNameEl);

  // Lower footer zone — click copies token name
  const footer = el(
    "div",
    {
      style: [
        "padding:6px 8px 8px",
        "display:flex",
        "flex-direction:column",
        "gap:3px",
        `border:1px solid rgba(${ink},0.10)`,
        "border-top:none",
        "border-radius:0 0 10px 10px",
        `background:rgba(${ink},0.04)`,
        token.tokenName ? "cursor:pointer" : "",
        "transition:background 0.12s ease",
      ].join(";"),
      title: token.tokenName ? `${token.tokenName} — click to copy` : undefined,
      onclick: token.tokenName
        ? () => {
            copyToClipboard(token.tokenName);
            ToastManager.success(`Copied ${token.tokenName}`);
          }
        : undefined,
      onmouseenter: token.tokenName
        ? (e) => {
            e.currentTarget.style.background = `rgba(${ink},0.09)`;
          }
        : undefined,
      onmouseleave: token.tokenName
        ? (e) => {
            e.currentTarget.style.background = `rgba(${ink},0.04)`;
          }
        : undefined,
    },
    footerChildren,
  );

  return el("div", { style: "display:flex;flex-direction:column;min-width:0" }, [swatch, footer]);
}

function _pvRoleBlock(roleIdx, variations, ink) {
  const role = appState.roles[roleIdx];
  const rName = (role && role.name) || `Role ${roleIdx}`;
  const scopeLabel = role && role.scope && role.scope !== "all" ? role.scope : null;

  const headerChildren = [
    el(
      "div",
      {
        style: [
          "font-size:12px",
          "font-weight:700",
          `color:rgba(${ink},0.90)`,
          "letter-spacing:0.01em",
          "white-space:nowrap",
          "overflow:hidden",
          "text-overflow:ellipsis",
        ].join(";"),
      },
      rName,
    ),
  ];
  if (scopeLabel) {
    headerChildren.push(
      el(
        "div",
        {
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
        },
        scopeLabel,
      ),
    );
  }

  const grid = el("div", {
    style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px",
  });
  for (const [varKey, token] of Object.entries(variations)) {
    grid.appendChild(_pvTokenTile(token, _pvVarLabel(varKey), ink));
  }

  return el("div", { style: "display:flex;flex-direction:column;gap:8px" }, [
    el("div", { style: "display:flex;align-items:center;gap:6px;min-width:0" }, headerChildren),
    grid,
  ]);
}

function _pvColorSection(colorName, roles, ink) {
  const colorEntry = appState.colors.find((c) => c.name === colorName);
  const swatchHex = colorEntry ? "#" + colorEntry.value.replace(/^#/, "") : "#888888";

  const header = el(
    "div",
    {
      style: "display:flex;align-items:center;gap:8px;margin-bottom:12px",
    },
    [
      el("div", {
        style: [`background:${swatchHex}`, "width:12px", "height:12px", "border-radius:3px", "flex-shrink:0", `box-shadow:0 0 0 1px rgba(${ink},0.12)`].join(
          ";",
        ),
      }),
      el(
        "div",
        {
          style: ["font-size:13px", "font-weight:700", `color:rgba(${ink},1)`, "letter-spacing:0.005em"].join(";"),
        },
        colorName,
      ),
    ],
  );

  const rolesEl = el("div", { style: "display:flex;flex-direction:column;gap:16px" });
  for (const [roleIdx, variations] of Object.entries(roles)) {
    rolesEl.appendChild(_pvRoleBlock(roleIdx, variations, ink));
  }

  return el(
    "div",
    {
      style: [`border:1px solid rgba(${ink},0.10)`, "border-radius:14px", "padding:16px", `background:rgba(${ink},0.03)`].join(";"),
    },
    [header, rolesEl],
  );
}

// ── TABLE VIEW ────────────────────────────────────────────────────────────────

// Re-group color→role→variation tokens into role→color→variation for "group by role" mode.
function _pvRegroupByRole(themeTokens) {
  const out = {};
  for (const [colorName, roles] of Object.entries(themeTokens)) {
    for (const [roleIdx, variations] of Object.entries(roles)) {
      if (!out[roleIdx]) out[roleIdx] = {};
      out[roleIdx][colorName] = variations;
    }
  }
  return out; // { roleIdx: { colorName: { varKey: token } } }
}

// Build one table for a single color section (Excel-style: color header row, role sub-headers, variation data rows).
function _pvTableSection(sectionName, subsections, ink) {
  const colorEntry = appState.colors.find((c) => c.name === sectionName);
  const sectionHex = colorEntry ? "#" + colorEntry.value.replace(/^#/, "") : null;

  // Decide header bg: for color grouping use the source color; for role grouping use a subtle tint
  const hdrBg = sectionHex || `rgba(${ink},0.08)`;
  const hdrInk = sectionHex ? (useWhiteLabel(sectionHex) ? "255,255,255" : "0,0,0") : ink;

  const COL = ["minmax(80px,1fr)", "64px", "64px", "56px", "minmax(120px,2fr)"];
  const gridStyle = `display:grid;grid-template-columns:${COL.join(" ")};align-items:center`;

  function hdrCell(text, style = "") {
    return el(
      "div",
      {
        style: [
          "font-size:10px",
          "font-weight:700",
          "letter-spacing:0.07em",
          "text-transform:uppercase",
          `color:rgba(${hdrInk},0.75)`,
          "padding:0 8px",
          "overflow:hidden",
          "text-overflow:ellipsis",
          "white-space:nowrap",
          style,
        ]
          .filter(Boolean)
          .join(";"),
      },
      text,
    );
  }

  function dataCell(children, style = "") {
    return el(
      "div",
      {
        style: ["padding:0 8px", "overflow:hidden", "min-width:0", style].filter(Boolean).join(";"),
      },
      Array.isArray(children) ? children : [children],
    );
  }

  const rows = [];

  // ── Color / section header row
  rows.push(
    el(
      "div",
      {
        style: [gridStyle, `background:${hdrBg}`, "height:32px", "border-radius:8px 8px 0 0", "position:sticky", "top:0", "z-index:2"].join(";"),
      },
      [
        hdrCell(sectionName, "font-size:11px;font-weight:800;letter-spacing:0.02em"),
        hdrCell("Hex"),
        hdrCell("Ratio"),
        hdrCell("Rating"),
        hdrCell("Token Name"),
      ],
    ),
  );

  let firstSubsection = true;
  for (const [subKey, variations] of Object.entries(subsections)) {
    // Sub-header row (role name when grouping by color, color name when grouping by role)
    const isRoleKey = _pvState.groupBy === "color";
    const subName = isRoleKey ? (appState.roles[subKey] && appState.roles[subKey].name) || `Role ${subKey}` : subKey;

    rows.push(
      el(
        "div",
        {
          style: [gridStyle, `background:rgba(${ink},0.05)`, "height:26px", !firstSubsection ? `border-top:1px solid rgba(${ink},0.08)` : ""]
            .filter(Boolean)
            .join(";"),
        },
        [
          el(
            "div",
            {
              style: [
                "padding:0 8px 0 16px",
                "font-size:10px",
                "font-weight:700",
                "letter-spacing:0.06em",
                "text-transform:uppercase",
                `color:rgba(${ink},0.50)`,
                "grid-column:1/-1",
                "overflow:hidden",
                "text-overflow:ellipsis",
                "white-space:nowrap",
              ].join(";"),
            },
            subName,
          ),
        ],
      ),
    );
    firstSubsection = false;

    // Variation data rows
    for (const [varKey, token] of Object.entries(variations)) {
      const varLabel = _pvVarLabel(varKey);
      const rMeta = _PV_RATING[token.contrast?.rating] || _PV_RATING["Fail"];
      const ratio = typeof token.contrast?.ratio === "number" ? token.contrast.ratio.toFixed(1) : "—";

      const swatchDot = el("div", {
        style: [`background:${token.value}`, "width:14px", "height:14px", "border-radius:3px", "flex-shrink:0", `box-shadow:0 0 0 1px rgba(${ink},0.12)`].join(
          ";",
        ),
      });

      const row = el(
        "div",
        {
          style: [gridStyle, "height:36px", `border-top:1px solid rgba(${ink},0.06)`, "cursor:pointer", "transition:background 0.1s ease"].join(";"),
          title: `${token.value.toUpperCase()} — click to copy hex`,
          onclick: () => {
            copyToClipboard(token.value);
            ToastManager.success(`Copied ${token.value.toUpperCase()}`);
          },
          onmouseenter: (e) => {
            e.currentTarget.style.background = `rgba(${ink},0.04)`;
          },
          onmouseleave: (e) => {
            e.currentTarget.style.background = "";
          },
        },
        [
          // Variation name + color dot
          dataCell([
            el("div", { style: "display:flex;align-items:center;gap:6px" }, [
              swatchDot,
              el(
                "span",
                {
                  style: [
                    "font-size:11px",
                    "font-weight:600",
                    `color:rgba(${ink},0.85)`,
                    "overflow:hidden",
                    "text-overflow:ellipsis",
                    "white-space:nowrap",
                  ].join(";"),
                },
                varLabel,
              ),
            ]),
          ]),
          // Hex
          dataCell(
            el(
              "span",
              {
                style: [
                  "font-size:10px",
                  "font-family:ui-monospace,SFMono-Regular,Menlo,monospace",
                  "font-weight:600",
                  `color:${token.value}`,
                  "letter-spacing:0.04em",
                  "cursor:pointer",
                ].join(";"),
                onclick: (e) => {
                  e.stopPropagation();
                  copyToClipboard(token.value);
                  ToastManager.success(`Copied ${token.value.toUpperCase()}`);
                },
              },
              token.value.toUpperCase(),
            ),
          ),
          // Ratio
          dataCell(
            el(
              "span",
              {
                style: ["font-size:12px", "font-weight:700", "font-variant-numeric:tabular-nums", `color:rgba(${ink},0.80)`].join(";"),
              },
              ratio,
            ),
          ),
          // Rating pill
          dataCell(
            el(
              "span",
              {
                style: [
                  `background:${rMeta.bg}`,
                  `color:${rMeta.fg}`,
                  "font-size:9px",
                  "font-weight:800",
                  "letter-spacing:0.07em",
                  "padding:2px 6px",
                  "border-radius:5px",
                  "line-height:1.5",
                  "white-space:nowrap",
                  "display:inline-block",
                ].join(";"),
              },
              rMeta.label,
            ),
          ),
          // Token name
          dataCell(
            token.tokenName
              ? el(
                  "span",
                  {
                    style: [
                      "font-size:10px",
                      "font-family:ui-monospace,SFMono-Regular,Menlo,monospace",
                      `color:rgba(${ink},0.45)`,
                      "overflow:hidden",
                      "text-overflow:ellipsis",
                      "white-space:nowrap",
                      "display:block",
                      "cursor:pointer",
                    ].join(";"),
                    title: `${token.tokenName} — click to copy`,
                    onclick: (e) => {
                      e.stopPropagation();
                      copyToClipboard(token.tokenName);
                      ToastManager.success(`Copied ${token.tokenName}`);
                    },
                  },
                  token.tokenName,
                )
              : el("span", { style: `color:rgba(${ink},0.20);font-size:10px` }, "—"),
          ),
        ],
      );

      rows.push(row);
    }
  }

  return el(
    "div",
    {
      style: [`border:1px solid rgba(${ink},0.10)`, "border-radius:10px", "overflow:hidden"].join(";"),
    },
    rows,
  );
}

// ── SCHEDULE ──────────────────────────────────────────────────────────────────

const schedulePreview = debounce(() => {
  if (document.getElementById("preview-screen").classList.contains("hidden")) return;
  try {
    const result = variableMaker(translateConfig(appState));
    renderPreviewPanel(result);
  } catch (err) {
    console.error("Preview render failed:", err);
  }
}, 500);

// ── RENDERERS ─────────────────────────────────────────────────────────────────

function renderPreviewPanel(result) {
  const themes = appState.themes || [];

  // ── Color Scale / Solved Colors panel
  const colorEl = document.getElementById("preview-colors");
  colorEl.innerHTML = "";
  if (Object.keys(result.scales).length === 0) {
    colorEl.innerHTML = `<p class="text-[12px] text-[var(--text-muted)] px-1 py-4 text-center">No scale in Direct mode. Colors are solved directly per variation target.</p>`;
  } else {
    const themeKeys = themes.map((t) => t.name.toLowerCase());
    for (const [colorName, scale] of Object.entries(result.scales)) {
      const colorEntry = appState.colors.find((c) => c.name === colorName);
      const colorIdx = appState.colors.findIndex((c) => c.name === colorName);
      const srcHex = "#" + (colorEntry ? colorEntry.value.replace(/^#/, "") : "888888");
      colorEl.appendChild(_pvColorScaleRow(colorName, colorIdx, srcHex, scale, themeKeys));
    }
  }

  // ── Alpha Tints
  if (appState.includeAlphaTints && appState.includeSourceColors) {
    const alphaInts = (appState.alphaValues || "10, 25, 50, 75, 90")
      .split(",")
      .map((v) => parseInt(v.trim()))
      .filter((v) => !isNaN(v));
    if (alphaInts.length > 0) {
      colorEl.appendChild(
        el("div", { class: "mb-4 mt-1" }, [
          el("div", { class: "text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)] mb-2 px-1" }, "Alpha Tints"),
          ...appState.colors.map((color) => _pvAlphaTintStrip(color, alphaInts)),
        ]),
      );
    }
  }

  // ── Theme panel toolbar (group-by + view-mode controls)
  const panelArea = document.getElementById("preview-theme-panels");
  if (!panelArea) return;

  let toolbar = document.getElementById("preview-theme-toolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.id = "preview-theme-toolbar";
    toolbar.style.cssText = ["display:none", "align-items:center", "gap:12px", "padding:0 4px 10px", "flex-wrap:wrap"].join(";");
    panelArea.parentNode.insertBefore(toolbar, panelArea);
  }
  toolbar.innerHTML = "";

  function _pvSegBtn(label, active, onclick) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.cssText = [
      "font-size:11px",
      "font-weight:600",
      "padding:3px 10px",
      "border-radius:6px",
      "border:none",
      "cursor:pointer",
      "transition:all 0.12s",
      active ? "background:var(--accent);color:#fff" : "background:var(--bg-input);color:var(--text-muted)",
    ].join(";");
    btn.onclick = onclick;
    return btn;
  }

  function _pvLabel(text) {
    const s = document.createElement("span");
    s.textContent = text;
    s.style.cssText = "font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);white-space:nowrap";
    return s;
  }

  function repaintPanels() {
    panelArea.querySelectorAll(".preview-theme-panel").forEach((p) => {
      const themeI = parseInt(p.dataset.themeIdx);
      const theme = (appState.themes || [])[themeI];
      if (!theme) return;
      renderThemePanel(p, result.tokens[theme.name.toLowerCase()] || {}, normalizeHex(theme.bg) || "#FFFFFF");
    });
  }

  // Group by
  const grpColor = _pvSegBtn("Color", _pvState.groupBy === "color", () => {
    _pvState.groupBy = "color";
    grpColor.style.background = "var(--accent)";
    grpColor.style.color = "#fff";
    grpRole.style.background = "var(--bg-input)";
    grpRole.style.color = "var(--text-muted)";
    repaintPanels();
  });
  const grpRole = _pvSegBtn("Role", _pvState.groupBy === "role", () => {
    _pvState.groupBy = "role";
    grpRole.style.background = "var(--accent)";
    grpRole.style.color = "#fff";
    grpColor.style.background = "var(--bg-input)";
    grpColor.style.color = "var(--text-muted)";
    repaintPanels();
  });

  // View mode
  const vmGrid = _pvSegBtn("Grid", _pvState.viewMode === "grid", () => {
    _pvState.viewMode = "grid";
    vmGrid.style.background = "var(--accent)";
    vmGrid.style.color = "#fff";
    vmTable.style.background = "var(--bg-input)";
    vmTable.style.color = "var(--text-muted)";
    repaintPanels();
  });
  const vmTable = _pvSegBtn("Table", _pvState.viewMode === "table", () => {
    _pvState.viewMode = "table";
    vmTable.style.background = "var(--accent)";
    vmTable.style.color = "#fff";
    vmGrid.style.background = "var(--bg-input)";
    vmGrid.style.color = "var(--text-muted)";
    repaintPanels();
  });

  const grpWrap = document.createElement("div");
  grpWrap.style.cssText = "display:flex;align-items:center;gap:3px";
  grpWrap.append(_pvLabel("Group"), document.createTextNode("  "), grpColor, grpRole);

  const vmWrap = document.createElement("div");
  vmWrap.style.cssText = "display:flex;align-items:center;gap:3px";
  vmWrap.append(_pvLabel("View"), document.createTextNode("  "), vmGrid, vmTable);

  toolbar.append(grpWrap, vmWrap);

  themes.forEach((theme, i) => {
    let panel = panelArea.querySelector(`[data-theme-idx="${i}"]`);
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "preview-panel preview-theme-panel";
      panel.dataset.themeIdx = i;
      panelArea.appendChild(panel);
    }
    panel.id = `preview-theme-panel-${i}`;
    renderThemePanel(panel, result.tokens[theme.name.toLowerCase()] || {}, normalizeHex(theme.bg) || "#FFFFFF");
  });

  // Remove panels for themes that no longer exist; fall back active tab if needed.
  panelArea.querySelectorAll(".preview-theme-panel").forEach((p) => {
    if (parseInt(p.dataset.themeIdx) >= themes.length) {
      if (p.classList.contains("active")) {
        const firstTab = document.querySelector("#preview-screen .preview-tab-btn:not(.hidden)");
        document.querySelectorAll("#preview-screen .preview-tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll("#preview-content .preview-panel, #preview-theme-panels > div").forEach((q) => q.classList.remove("active"));
        if (firstTab) {
          firstTab.classList.add("active");
          const fallback = document.getElementById(firstTab.dataset.target);
          if (fallback) fallback.classList.add("active");
        }
        syncPreviewBackground();
      }
      p.remove();
    }
  });
}

function renderThemePanel(panelOrId, themeTokens, bgHex) {
  const panelEl = typeof panelOrId === "string" ? document.getElementById(panelOrId) : panelOrId;
  panelEl.innerHTML = "";
  panelEl.dataset.bg = bgHex || "";
  panelEl.style.backgroundColor = "transparent";

  const ink = useWhiteLabel(bgHex || "#FFFFFF") ? "255,255,255" : "0,0,0";
  panelEl.style.setProperty("--pv-ink", ink);
  panelEl.style.setProperty("--pv-text", `rgb(${ink})`);
  panelEl.style.setProperty("--pv-muted", `rgba(${ink},0.55)`);
  panelEl.style.setProperty("--pv-border", `rgba(${ink},0.15)`);
  panelEl.style.setProperty("--pv-hover", `rgba(${ink},0.07)`);
  panelEl.style.setProperty("--pv-hover-border", `rgba(${ink},0.25)`);

  // Wrap content so the panel element itself stays display:block (tab system controls visibility via .active)
  const inner = el("div", {
    style: "display:flex;flex-direction:column;gap:16px;padding:8px 4px 16px",
  });

  const isTable = _pvState.viewMode === "table";
  const isByRole = _pvState.groupBy === "role";

  if (isByRole) {
    // role → { colorName → { varKey → token } }
    const byRole = _pvRegroupByRole(themeTokens);
    for (const [roleIdx, colors] of Object.entries(byRole)) {
      if (isTable) {
        inner.appendChild(_pvTableSection(_pvRoleName(roleIdx), colors, ink));
      } else {
        // Grid: one _pvColorSection per role, with colors as the subsections
        // Reuse _pvColorSection logic inverted: header = role, children = color blocks
        const rName = _pvRoleName(roleIdx);
        const roleHeader = el(
          "div",
          {
            style: "display:flex;align-items:center;gap:8px;margin-bottom:12px",
          },
          [
            el(
              "div",
              {
                style: ["font-size:13px", "font-weight:700", `color:rgba(${ink},1)`, "letter-spacing:0.005em"].join(";"),
              },
              rName,
            ),
          ],
        );
        const colorsEl = el("div", { style: "display:flex;flex-direction:column;gap:16px" });
        for (const [colorName, variations] of Object.entries(colors)) {
          // Sub-block: color name header + tile grid
          const cEntry = appState.colors.find((c) => c.name === colorName);
          const cHex = cEntry ? "#" + cEntry.value.replace(/^#/, "") : "#888888";
          const subHeader = el(
            "div",
            {
              style: "display:flex;align-items:center;gap:6px;min-width:0;margin-bottom:8px",
            },
            [
              el("div", {
                style: [`background:${cHex}`, "width:10px", "height:10px", "border-radius:2px", "flex-shrink:0", `box-shadow:0 0 0 1px rgba(${ink},0.12)`].join(
                  ";",
                ),
              }),
              el(
                "div",
                {
                  style: `font-size:11px;font-weight:700;color:rgba(${ink},0.70)`,
                },
                colorName,
              ),
            ],
          );
          const grid = el("div", {
            style: "display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px",
          });
          for (const [varKey, token] of Object.entries(variations)) {
            grid.appendChild(_pvTokenTile(token, _pvVarLabel(varKey), ink));
          }
          colorsEl.appendChild(el("div", {}, [subHeader, grid]));
        }
        inner.appendChild(
          el(
            "div",
            {
              style: [`border:1px solid rgba(${ink},0.10)`, "border-radius:14px", "padding:16px", `background:rgba(${ink},0.03)`].join(";"),
            },
            [roleHeader, colorsEl],
          ),
        );
      }
    }
  } else {
    // Default: color → role → variation
    for (const [colorName, roles] of Object.entries(themeTokens)) {
      if (isTable) {
        inner.appendChild(_pvTableSection(colorName, roles, ink));
      } else {
        inner.appendChild(_pvColorSection(colorName, roles, ink));
      }
    }
  }

  panelEl.appendChild(inner);
  if (panelEl.classList.contains("active")) {
    syncPreviewBackground();
  }
}

function _pvRoleName(roleIdx) {
  return (appState.roles[roleIdx] && appState.roles[roleIdx].name) || `Role ${roleIdx}`;
}

function renderPreviewTabs() {
  const tabBar = document.querySelector("#preview-screen .sidebar-tabs");
  if (!tabBar) return;
  tabBar.querySelectorAll(".preview-theme-tab").forEach((b) => b.remove());

  const isDirect = appState.pluginMode === "direct";
  const paletteTab = tabBar.querySelector("[data-target='preview-colors']");
  if (paletteTab) paletteTab.classList.toggle("hidden", isDirect);

  const themes = appState.themes || [];
  themes.forEach((theme, i) => {
    const btn = document.createElement("button");
    btn.className = "preview-tab-btn preview-theme-tab";
    btn.dataset.target = `preview-theme-panel-${i}`;
    btn.textContent = theme.name || `Theme ${i + 1}`;
    tabBar.appendChild(btn);
  });
}

function syncPreviewBackground() {
  const contentEl = document.getElementById("preview-content");
  if (!contentEl) return;
  const activePanel = document.querySelector("#preview-content .preview-panel.active");
  if (activePanel && activePanel.dataset.bg) {
    contentEl.style.backgroundColor = activePanel.dataset.bg;
  } else {
    contentEl.style.backgroundColor = "";
  }
}
