/**
 * ============================================================================
 * Token Wand BETA LAB
 * Experimental UI entry point for in-progress features not yet in main flow.
 * Set LAB_ENABLED = true to expose the Beta Lab entry point in More Options.
 * ============================================================================
 */

const LAB_ENABLED = false;

(function () {
  if (!LAB_ENABLED) return;

  function init() {
    const moreSheet = document.getElementById("more-sheet");
    if (!moreSheet) return;

    const clearSection = moreSheet.querySelector("#opt-clear");
    const anchor = clearSection ? clearSection.closest("div") : null;

    const btn = document.createElement("button");
    btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left hover:bg-[var(--bg-hover)] transition-all group";
    btn.innerHTML = `<span class="text-[18px]">⚗</span><div><div class="text-[13px] font-medium text-[var(--text-primary)]">Design Lab</div><div class="text-[11px] text-[var(--text-muted)]">Preview panel — variant B</div></div>`;
    btn.onclick = () => {
      const closeBtn = document.getElementById("close-more");
      if (closeBtn) closeBtn.click();
      renderLabPreview();
      showOverlay("design-lab-overlay");
    };

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(btn, anchor);
    } else {
      moreSheet.querySelector(".p-2")?.appendChild(btn);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
