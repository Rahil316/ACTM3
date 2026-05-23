/**
 * ============================================================================
 * Token Wand SCREEN: PROJECT TAB
 * Renders: Quick Start, Project Profile card, Theme Shop preview, Versions.
 * ============================================================================
 */

// ── QUICK START ───────────────────────────────────────────────────────────────

function renderQuickStart() {
  const slot = document.getElementById("quickstart-overlay");
  if (!slot) return;
  slot.innerHTML = "";

  slot.appendChild(
    el("div", { class: "flex flex-col items-center gap-6 w-full max-w-[320px]" }, [
      el(
        "div",
        { class: "w-16 h-16 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] text-[32px] font-bold select-none" },
        ["✦"],
      ),

      el("div", { class: "space-y-1" }, [
        el("h1", { class: "text-[22px] font-bold text-[var(--text-primary)]" }, [t("welcome-to-token-wand")]),
        el("p", { class: "text-[13px] text-[var(--text-muted)] leading-relaxed" }, ["How would you like to start?"]),
      ]),

      el("div", { class: "w-full space-y-3" }, [
        inputsUI.btn("primary", {
          label: t("start-from-blank"),
          size: "xl",
          class: "w-full",
          onclick: () => {
            loadState(JSON.parse(JSON.stringify(_bootstrapConfig)));
            setSavedState(null);
            renderColorGroups();
            renderRoles();
            syncInputsFromState();
            schedulePreview();
            hideOverlay("quickstart-overlay");
          },
        }),
        inputsUI.btn("secondary", {
          label: t("browse-templates"),
          size: "xl",
          class: "w-full",
          onclick: () => {
            const shopOverlay = document.getElementById("theme-shop-overlay");
            if (shopOverlay) {
              shopOverlay.classList.remove("hidden");
              renderThemeShop();
            }
          },
        }),
      ]),
    ]),
  );
}

// ── PROJECT PROFILE ───────────────────────────────────────────────────────────

function _renderProjectProfile() {
  const sectionId = "project-profile-section";
  return el("div", { id: sectionId, class: "settings-card" }, [
    el(
      "div",
      {
        class: "flex items-center justify-between cursor-pointer select-none",
        role: "button",
        "aria-expanded": "true",
        onclick: () => toggleSection(sectionId),
      },
      [
        el("p", { class: "text-[11px] font-bold tracking-[0.6px] text-[var(--text-muted)] uppercase" }, ["Project Profile"]),
        el("span", { class: "chevron text-[var(--text-muted)] text-[10px]" }, ["▲"]),
      ],
    ),

    el("div", { class: "section-content space-y-3 pt-2" }, [
      panelUI.input({
        value: appState.name || "",
        placeholder: "Token Wand",
        label: "Name",
        width: "full",
        size: "lg",
        oninput: (e) => updateProjectName(e.target.value),
      }),
      panelUI.input({
        value: appState.description || "",
        placeholder: "Describe your design system…",
        label: "Description",
        width: "full",
        size: "lg",
        oninput: (e) => updateProjectDescription(e.target.value),
      }),

      el("div", { class: "space-y-2 pt-2 border-t border-[var(--border)]" }, [
        el("div", { class: "flex items-center justify-between" }, [
          el("p", { class: "text-[11px] text-[var(--text-muted)] font-medium" }, ["Themes (modes)"]),
          el(
            "button",
            {
              onclick: () => {
                addTheme();
                renderSidebarProject();
              },
              class:
                "h-[26px] px-2 text-[11px] font-medium rounded-[6px] text-[var(--accent)] hover:bg-[var(--bg-hover)] border border-dashed border-[var(--border)] transition-colors",
            },
            ["+ Add"],
          ),
        ]),
        el("div", { id: "project-themes-list", class: "space-y-1.5" }),
      ]),
    ]),
  ]);
}

// ── THEME SHOP PREVIEW ────────────────────────────────────────────────────────

function _renderThemeShopPreview() {
  const openShop = () => {
    const overlay = document.getElementById("theme-shop-overlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      renderThemeShop();
    }
  };
  const presets = typeof PRESETS !== "undefined" ? PRESETS.slice(0, 4) : [];
  const enterShopBtn = inputsUI.btn("dashed", { class: "min-w-fit", label: "Explore more themes →", onclick: openShop });
  const badge = el("span", { class: "shrink-0 text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[var(--accent)] text-white" }, ["✦ New"]);
  return el("div", { class: "settings-card space-y-3" }, [
    el("div", { class: "flex items-start justify-between gap-2" }, [
      el("div", { class: "w-full" }, [
        el("p", { class: "text-[13px] font-bold text-[var(--text-primary)]" }, ["Theme Shop"]),
        el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed" }, ["Load a complete design system in one click."]),
      ]),
      enterShopBtn,
    ]),
    el(
      "div",
      { class: "grid grid-cols-1 min-[520px]:grid-cols-2 gap-2" },
      presets.map((p) => _presetCard(p)),
    ),
  ]);
}

// ── VERSIONS ─────────────────────────────────────────────────────────────────

function _openSaveVersionSheet() {
  let vName = "",
    vDesc = "";

  createDialogue("dialogue-sheet", {
    layout: "bottom-sheet",
    title: "Save Version",
    body: "Snapshot your current colors, roles, themes and settings.",
    buttons: [
      {
        label: "Save",
        variant: "primary",
        action: () => {
          const name = vName.trim() || "Untitled version";
          const saved = saveVersion(name, vDesc.trim());
          if (saved) {
            if (activeSidebarTab === "project") renderSidebarProject();
            BannerManager.show({ type: "success", message: `Version "${name}" saved.`, autoClose: 2500 });
          }
        },
      },
      { label: t("cancel"), variant: "ghost" },
    ],
  });

  // Inject inputs into the sheet body after it renders
  requestAnimationFrame(() => {
    const sheet = document.getElementById("dialogue-sheet");
    if (!sheet) return;
    const bodyBorder = sheet.querySelector(".border-b");
    if (!bodyBorder) return;
    const inputWrap = el("div", { class: "px-4 pb-4 space-y-3" }, [
      panelUI.input({
        placeholder: "e.g. Before dark mode pass",
        label: "Name",
        width: "full",
        size: "lg",
        oninput: (e) => {
          vName = e.target.value;
        },
      }),
      panelUI.input({
        placeholder: "Optional notes…",
        label: "Description",
        width: "full",
        size: "lg",
        oninput: (e) => {
          vDesc = e.target.value;
        },
      }),
    ]);
    bodyBorder.after(inputWrap);
    const firstInput = inputWrap.querySelector("input");
    if (firstInput) setTimeout(() => firstInput.focus(), 80);
  });
}

function _renderVersions() {
  const versions = appState.versions || [];
  const saveTooltip = versionSaveBlockedReason();
  const saveDisabled = !!saveTooltip;

  const header = el("div", { class: "flex items-center justify-between" }, [
    el("p", { class: "text-[11px] font-bold tracking-[0.6px] text-[var(--text-muted)] uppercase" }, ["Versions"]),
    el(
      "button",
      {
        onclick: saveDisabled ? null : _openSaveVersionSheet,
        disabled: saveDisabled,
        "data-tooltip": saveTooltip || "",
        class: `h-[26px] px-2 text-[11px] font-medium rounded-[6px] border border-dashed transition-colors ${saveDisabled ? "text-[var(--text-dim)] border-[var(--border)] opacity-40 cursor-not-allowed" : "text-[var(--accent)] hover:bg-[var(--bg-hover)] border-[var(--border)]"}`,
      },
      ["+ Save"],
    ),
  ]);

  if (versions.length === 0) {
    return el("div", { class: "space-y-2" }, [
      header,
      el("div", { class: "settings-card flex flex-col items-center gap-3 py-6 text-center" }, [
        el("div", { class: "w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center text-[var(--text-muted)] text-[18px]" }, ["🔖"]),
        el("div", { class: "space-y-1" }, [
          el("p", { class: "text-[13px] font-semibold text-[var(--text-primary)]" }, ["No versions yet"]),
          el("p", { class: "text-[11px] text-[var(--text-muted)] leading-relaxed max-w-[220px]" }, [
            'Save snapshots of your setup — colors, roles, themes and all settings — to revisit any earlier state. Click the bookmark icon or "+ Save" anytime.',
          ]),
        ]),
      ]),
    ]);
  }

  const rows = versions.map((v) =>
    el("div", { class: "settings-card flex items-start justify-between gap-3" }, [
      el(
        "div",
        { class: "flex-1 min-w-0" },
        [
          el("p", { class: "text-[13px] font-semibold text-[var(--text-primary)] truncate" }, [v.name]),
          v.description ? el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed" }, [v.description]) : null,
          el("p", { class: "text-[10px] text-[var(--text-dim)] mt-1" }, [_relativeTime(v.createdAt)]),
        ].filter(Boolean),
      ),
      el("div", { class: "flex gap-1 shrink-0" }, [
        inputsUI.btn("secondary", {
          label: "Restore",
          size: "sm",
          onclick: () => {
            restoreVersion(v._id);
            renderColorGroups();
            renderRoles();
            syncInputsFromState();
            schedulePreview();
            renderSidebarProject();
            BannerManager.show({ type: "success", message: `Restored: "${v.name}"`, autoClose: 2500 });
          },
        }),
        inputsUI.btn("danger", {
          size: "sm",
          square: true,
          icon: Icons.Close,
          onclick: () => {
            deleteVersion(v._id);
            renderSidebarProject();
          },
        }),
      ]),
    ]),
  );

  return el("div", { class: "space-y-2" }, [header, ...rows]);
}

// ── MAIN RENDERER ─────────────────────────────────────────────────────────────

function renderSidebarProject() {
  const container = document.getElementById("sidebar-content-container");
  if (!container) return;
  container.innerHTML = "";

  [_renderProjectProfile(), _renderThemeShopPreview(), _renderVersions()].forEach((node) => node && container.appendChild(node));

  renderSettingsThemes("project-themes-list");
  if (typeof syncVersionButton === "function") syncVersionButton();
}
