import type { EngineResult } from "../../types/state";
import { banner } from "../../store/bannerStore";

// ── Accessibility warnings ────────────────────────────────────────────────────

export function reportAccessibilityWarnings(result: EngineResult, pluginMode: string): void {
  const { warnings } = result.errors;
  // In direct mode the solver always produces the closest achievable color —
  // "can't hit exact target" is expected and not actionable for the user.
  // Contrast warnings only apply in scale mode where steps are discrete.
  if (!warnings || warnings.length === 0 || pluginMode !== "scale") {
    banner.remove("preview-contrast-warnings");
    return;
  }
  const msg = `${warnings.length} contrast warning${warnings.length > 1 ? "s" : ""}: some tokens may not meet their contrast targets.`;
  banner.show({ id: "preview-contrast-warnings", type: "warning", title: "Contrast Warnings", message: msg });
}
