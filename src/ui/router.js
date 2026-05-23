/**
 * ============================================================================
 * Token Wand ROUTER
 * Single owner of all screen and overlay visibility.
 * No appState mutations — pure show/hide logic.
 * ============================================================================
 */

// ── COLLAPSIBLE SECTIONS ──

function toggleSection(id, event) {
  if (event && event.target.closest("button")) return;
  const section = document.getElementById(id);
  if (!section) return;
  const isCollapsed = section.classList.toggle("collapsed");
  const trigger = section.querySelector('[role="button"]');
  if (trigger) trigger.setAttribute("aria-expanded", !isCollapsed);
}

// ── SHEETS & OVERLAYS ──

function showSheet(id) {
  const sheet = document.getElementById(id);
  if (!sheet) return;
  sheet.removeAttribute("inert");
  sheet.classList.add("open");
  document.getElementById("overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function hideSheets() {
  document.querySelectorAll(".bottom-sheet").forEach((s) => {
    s.classList.remove("open");
    s.setAttribute("inert", "");
  });
  document.getElementById("overlay").classList.remove("active");
  document.body.style.overflow = "";
}

function showOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
}

function hideOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("hidden");
  if (id === "success-overlay" || id === "error-overlay") hideSheets();
}

// ── SETTINGS TABS ──

function switchSettingsTab(tab) {
  document.querySelectorAll(".settings-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.querySelectorAll(".settings-panel").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.panel !== tab));
}

// ── DIALOGUE FACTORY ──
// Builds a confirm dialog and shows it.
//
// layout: "row"          — floating card, side-by-side buttons (default)
//                          targetID must be a centered overlay slot
//         "stacked"      — floating card, icon + stacked buttons
//                          targetID must be a centered overlay slot
//         "bottom-sheet" — slides up from the bottom edge
//                          targetID should be "dialogue-sheet"

function createDialogue(targetID, { title = "Are you sure?", body = "", icon = null, buttons = [{ label: t("cancel") }], layout = "row" } = {}) {
  const slot = document.getElementById(targetID);
  if (!slot) return;
  slot.innerHTML = "";

  // ── Bottom-sheet layout ──────────────────────────────────────────────────
  if (layout === "bottom-sheet") {
    const mkBtn = ({ label, variant = "secondary", id = null, action }) =>
      inputsUI.btn(variant, {
        id,
        label,
        size: "xl",
        class: "w-full",
        onclick: () => {
          hideSheets();
          action?.();
        },
      });

    slot.appendChild(
      el("div", { class: "flex flex-col" }, [
        // drag handle
        el("div", { class: "flex justify-center pt-3 pb-1" }, [el("div", { class: "w-9 h-1 rounded-full bg-[var(--border)]" })]),
        // header
        el(
          "div",
          { class: "px-5 pt-3 pb-4 border-b border-[var(--border)]" },
          [
            icon ? el("div", { class: "mb-3" }, [icon]) : null,
            el("h2", { class: "text-[17px] font-bold text-[var(--text-primary)]" }, title),
            body ? el("p", { class: "text-[12px] text-[var(--text-muted)] leading-relaxed mt-1" }, body) : null,
          ].filter(Boolean),
        ),
        // buttons
        el("div", { class: "p-4 space-y-2" }, buttons.map(mkBtn)),
      ]),
    );

    // Close other open sheets without closing the target, then open it directly.
    document.querySelectorAll(".bottom-sheet").forEach((s) => {
      if (s.id !== targetID) {
        s.classList.remove("open");
        s.setAttribute("inert", "");
      }
    });
    showSheet(targetID);
    return;
  }

  // ── Floating card layouts (row / stacked) ────────────────────────────────
  const stacked = layout === "stacked";

  const mkBtn = ({ label, variant = "secondary", id = null, action }) =>
    inputsUI.btn(variant, {
      id,
      label,
      size: stacked ? "xl" : "lg",
      class: stacked ? "w-full" : "flex-1",
      onclick: () => {
        hideOverlay(targetID);
        action?.();
      },
    });

  const btnContainer = el("div", { class: stacked ? "w-full space-y-3" : "flex gap-2 w-full" }, buttons.map(mkBtn));

  const cardCls = "bg-[var(--bg-card)] rounded-[14px] border border-[var(--border)] shadow-xl w-full max-w-[320px]";

  if (stacked) {
    slot.appendChild(
      el("div", { class: cardCls }, [
        el(
          "div",
          { class: "flex flex-col items-center gap-5 p-6 text-center" },
          [
            icon || null,
            el(
              "div",
              { class: "space-y-2 w-full" },
              [
                el("h2", { class: "text-[17px] font-bold text-[var(--text-primary)]" }, title),
                body ? el("p", { class: "text-[12px] text-[var(--text-muted)] leading-relaxed" }, body) : null,
              ].filter(Boolean),
            ),
            btnContainer,
          ].filter(Boolean),
        ),
      ]),
    );
  } else {
    slot.appendChild(
      el("div", { class: cardCls }, [
        el(
          "div",
          { class: "space-y-4 p-5" },
          [
            el("p", { class: "text-[15px] font-semibold text-[var(--text-primary)] text-left" }, title),
            body ? el("p", { class: "text-[12px] text-[var(--text-muted)] leading-relaxed text-left" }, body) : null,
            btnContainer,
          ].filter(Boolean),
        ),
      ]),
    );
  }

  hideSheets();
  showOverlay(targetID);
}

// ── SIDEBAR TABS ──
// Mutates activeSidebarTab and triggers the appropriate screen renderer.

function switchSidebarTab(tab) {
  activeSidebarTab = tab;
  document.querySelectorAll(".sidebar-tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  if (tab === "color-groups") renderColorGroups();
  else if (tab === "roles-config") renderRoles();
  else if (tab === "project") renderSidebarProject();
}
