// ── PRESETS ──────────────────────────────────────────────────────────────────
// PRESETS global is assembled by src/ui/screens/presets/index.js.
// To add a design system: create presets/<system>.js, add a script tag in
// ui.html before presets/index.js, and spread it in index.js.

// ── RENDERER ─────────────────────────────────────────────────────────────────

function renderThemeShop() {
  const overlay = document.getElementById("theme-shop-overlay");
  if (!overlay) return;
  overlay.innerHTML = "";

  // Header
  overlay.appendChild(
    el("div", { class: "flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0" }, [
      el("div", {}, [
        el("h2", { class: "text-[15px] font-semibold text-[var(--text-primary)]" }, ["Design System Presets"]),
        el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, ["Load a preset and start using it — everything is editable after loading."]),
      ]),
      el("button", {
        onclick: () => overlay.classList.add("hidden"),
        class: "w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors text-[18px] leading-none",
        title: "Close",
      }, ["×"]),
    ])
  );

  // shopList
  const shopList = el("div", { class: "p-2 space-y-2 overflow-y-auto flex-1" });
  PRESETS.forEach((preset) => shopList.appendChild(_presetCard(preset)));
  overlay.appendChild(shopList);

  // Keyboard close
  const onKey = (e) => {
    if (e.key === "Escape") { overlay.classList.add("hidden"); document.removeEventListener("keydown", onKey); }
  };
  document.addEventListener("keydown", onKey);
}
// ── Theme Shop Card ─────────────────────────────────────────────────────────
function _presetCard(preset) {
  const isTW = preset.badge === "TW";
  return el("div", { class: "bg-[var(--bg-panel)] rounded-xl border-[var(--border)] flex flex-col gap-1.5 p-2" }, [
    // Badge + name row
    el("div", { class: "flex items-start justify-between gap-1" }, [
      el("div", {}, [
        el("div", { class: "flex items-center gap-1.5 mb-1" }, [
          isTW
            ? el("span", { class: "text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[var(--accent)] text-white" }, [preset.badge])
            : el("span", { class: "text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[var(--bg-active)] text-[var(--text-muted)]" }, [preset.badge]),
        ]),
        el("p", { class: "text-[13px] font-semibold text-[var(--text-primary)] leading-tight" }, [preset.name]),
      ]),
    ]),

    // Swatch strip
    _swatchStrip(preset.config.colors),

    // Description
    el("p", { class: "text-[11px] text-[var(--text-muted)] leading-relaxed" }, [preset.description]),

    // Tags
    el("div", { class: "flex flex-wrap gap-1" },
      preset.tags.map((tag) =>
        el("span", { class: "text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]" }, [tag])
      )
    ),

    // Stats row
    el("div", { class: "flex gap-3 text-[10px] text-[var(--text-dim)]" }, [
      el("span", {}, [`${preset.config.colors.length} colors`]),
      el("span", {}, [`${preset.config.roles.length} roles`]),
      el("span", {}, [`${preset.config.themes.length} themes`]),
    ]),

    // Load button
    el("button", {
      onclick: () => _loadPreset(preset),
      class: `w-full h-[30px] rounded-[7px] text-[12px] font-semibold transition-colors ${
        isTW
          ? "bg-[var(--accent)] hover:opacity-90 text-white"
          : "bg-[var(--bg-input)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)]"
      }`,
    }, [`Load ${preset.name}`]),
  ]);
}
// ── Theme Shop Swatch Strip ─────────────────────────────────────────────────
function _swatchStrip(colors) {
  return el("div", { class: "flex gap-1 h-[18px]" },
    colors.map((c) =>
      el("div", {
        class: "flex-1 rounded-[4px]",
        style: `background:#${c.value.replace(/^#/, "")}`,
        title: c.name,
      })
    )
  );
}
// ── Theme Shop Load Preset ──────────────────────────────────────────────────
function _loadPreset(preset) {
  loadState(preset.config);
  document.getElementById("theme-shop-overlay").classList.add("hidden");

  // Re-render all active screens
  if (typeof renderColorGroups === "function")    renderColorGroups();
  if (typeof renderRoles === "function")           renderRoles();
  if (typeof renderSidebarProject === "function") renderSidebarProject();
  if (typeof syncInputsFromState === "function")  syncInputsFromState();

  // Switch to project tab so the user sees the loaded preset name and themes
  if (typeof switchSidebarTab === "function") switchSidebarTab("project");
}
