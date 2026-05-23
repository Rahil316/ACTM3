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
  const header = el(
    "div",
    {
      class: "flex items-center gap-3 px-3 py-3 border-b border-[var(--border)] shrink-0",
    },
    [
      inputsUI.btn("icon", {
        onclick: () => overlay.classList.add("hidden"),
        icon: Icons.ChevronLeft,
        size: "md",
        title: "Back",
      }),
      el("div", {}, [
        el("h2", { class: "text-[15px] font-semibold text-[var(--text-primary)]" }, [t("shop.header.header")]),
        el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, [t("shop.header.subHeader")]),
      ]),
    ],
  );
  overlay.appendChild(header);

  // shopList
  const shopList = el("div", {
    class: "p-2 grid grid-cols-1 min-[520px]:grid-cols-2 gap-2 overflow-y-auto flex-1 content-start",
  });
  PRESETS.forEach((preset) => shopList.appendChild(_presetCard(preset)));
  overlay.appendChild(shopList);

  // Keyboard close
  const onKey = (e) => {
    if (e.key === "Escape") {
      overlay.classList.add("hidden");
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);
}
// ── Theme Shop Card ─────────────────────────────────────────────────────────
function _presetCard(preset) {
  const isTW = preset.badge === "TW";
  const isLoaded = appState._presetId && appState._presetId === preset.id;
  return el(
    "div",
    {
      class: `bg-[var(--bg-panel)] rounded-xl border flex flex-col gap-1.5 p-3 ${isLoaded ? "border-[var(--accent)]" : "border-[var(--border)]"}`,
    },
    [
      // Badge + name row with load button on the right
      el("div", { class: "flex items-start justify-between gap-2" }, [
        el("div", {}, [
          el("div", { class: "flex items-center gap-1.5 mb-1" }, [
            isTW
              ? el(
                  "span",
                  {
                    class: "text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[var(--accent)] text-white",
                  },
                  [preset.badge],
                )
              : el(
                  "span",
                  {
                    class: "text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[var(--bg-active)] text-[var(--text-muted)]",
                  },
                  [preset.badge],
                ),
          ]),
          el(
            "p",
            {
              class: "text-[13px] font-semibold text-[var(--text-primary)] leading-tight",
            },
            [preset.name],
          ),
        ]),
        isLoaded
          ? el(
              "div",
              {
                class:
                  "shrink-0 h-[28px] px-3 rounded-[7px] text-[11px] font-semibold flex items-center gap-1 bg-[var(--accent)]/10 border border-[var(--accent)] text-[var(--accent)]",
              },
              [t("loaded")],
            )
          : inputsUI.btn(isTW ? "primary" : "secondary", {
              onclick: () => _loadPreset(preset),
              size: "sm",
              label: t("load"),
              class: "shrink-0 font-semibold",
            }),
      ]),

      // Swatch strip
      _swatchStrip(preset.config.colors),

      // Description
      el("p", { class: "text-[11px] text-[var(--text-muted)] leading-relaxed" }, [preset.description]),

      // Tags
      el(
        "div",
        { class: "flex flex-wrap gap-1" },
        preset.tags.map((tag) =>
          el(
            "span",
            {
              class: "text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--bg-input)] text-[var(--text-muted)] border border-[var(--border)]",
            },
            [tag],
          ),
        ),
      ),

      // Stats row
      el("div", { class: "flex gap-3 text-[10px] text-[var(--text-dim)]" }, [
        el("span", {}, [`${preset.config.colors.length} colors`]),
        el("span", {}, [`${preset.config.roles.length} roles`]),
        el("span", {}, [`${preset.config.themes.length} themes`]),
      ]),
    ],
  );
}
// ── Theme Shop Swatch Strip ─────────────────────────────────────────────────
function _swatchStrip(colors) {
  return el(
    "div",
    { class: "flex gap-1 h-[18px]" },
    colors.map((c) =>
      el("div", {
        class: "flex-1 rounded-[4px]",
        style: `background:#${c.value.replace(/^#/, "")}`,
        title: c.name,
      }),
    ),
  );
}
// ── Theme Shop Load Preset ──────────────────────────────────────────────────
function _loadPreset(preset) {
  loadState(preset.config);
  appState._presetId = preset.id;
  document.getElementById("theme-shop-overlay").classList.add("hidden");
  hideOverlay("quickstart-overlay");

  // Re-render all active screens
  if (typeof renderColorGroups === "function") renderColorGroups();
  if (typeof renderRoles === "function") renderRoles();
  if (typeof renderSidebarProject === "function") renderSidebarProject();
  if (typeof syncInputsFromState === "function") syncInputsFromState();

  // Switch to palettes tab so the user can start working immediately
  if (typeof switchSidebarTab === "function") switchSidebarTab("color-groups");

  BannerManager.show({
    type: "success",
    message: `"${preset.name}" loaded — everything is editable.`,
    autoClose: 3000,
  });
}
