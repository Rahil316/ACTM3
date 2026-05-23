/**
 * ============================================================================
 * Token Wand SCREEN: PALETTE TAB
 * Renders the color group cards into the sidebar.
 * ============================================================================
 */

// ── PALETTE SCREEN ────────────────────────────────────────────────────────────

const renderColorGroups = debounce(() => {
  if (activeSidebarTab !== "color-groups") return;
  withPreservedFocus(() => {
    const container = document.getElementById("sidebar-content-container");
    const fragment = document.createDocumentFragment();
    fragment.appendChild(inputsUI.actionButton("+ Add Color", addGroup, { "data-action": "add-color" }));

    if (appState.colors.length === 0) {
      const empty = document.createElement("div");
      empty.className = "flex flex-col items-center justify-center py-12 px-4 text-center";
      empty.innerHTML = `
        <p class="text-[13px] font-medium text-[var(--text-muted)] mb-1">No colors yet</p>
        <p class="text-[11px] text-[var(--text-muted)] opacity-70">Click <strong>+ Add Color</strong> above to add your first palette color. Each color generates a full color scale used across all roles.</p>
      `;
      fragment.appendChild(empty);
    }

    appState.colors.forEach((group, idx) => {
      const card = document.createElement("div");
      card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 color-group-card-plugin shadow-sm hover:shadow-md transition-all group relative overflow-hidden";

      bindDragDrop(card, idx, {
        cardSelector: ".color-group-card-plugin",
        getIdx: () => _colorDragSrcIdx,
        setIdx: (v) => { _colorDragSrcIdx = v; },
        onDrop: (src, dst) => {
          const [moved] = appState.colors.splice(src, 1);
          appState.colors.splice(dst, 0, moved);
          renderColorGroups();
          schedulePreview();
        },
      });

      Components.ColorGroupCard(group, idx, appState).forEach((node) => card.appendChild(node));
      card.querySelectorAll("input, select, button, label").forEach((el) => el.setAttribute("draggable", "false"));
      fragment.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  });
}, 50);
