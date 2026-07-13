import type { EngineResult } from "../../types/state";

// ── Errors summary banner ─────────────────────────────────────────────────────

export function ErrorsBanner({ errors }: { errors: EngineResult["errors"] }) {
  const hasAnything = errors.critical.length > 0 || errors.warnings.length > 0 || errors.notices.length > 0;

  if (!hasAnything) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          borderRadius: 6,
          background: "rgba(52,211,153,0.08)",
          border: "1px solid rgba(52,211,153,0.2)",
          marginBottom: 14,
          fontSize: 10,
          color: "#34d399",
        }}
      >
        ✓ No errors, warnings or notices
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {errors.critical.length > 0 && (
        <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.35)", marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>
            ✕ {errors.critical.length} critical error{errors.critical.length > 1 ? "s" : ""}
          </div>
          {errors.critical.map((c, i) => (
            <div key={i} style={{ fontSize: 10, color: "#fca5a5", marginBottom: 2 }}>
              {String(c)}
            </div>
          ))}
        </div>
      )}
      {errors.warnings.length > 0 && (
        <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", marginBottom: 4 }}>
            ⚠ {errors.warnings.length} warning{errors.warnings.length > 1 ? "s" : ""}
          </div>
          {errors.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 10, color: "#fde68a", marginBottom: 2 }}>
              <span style={{ color: "#92400e" }}>
                {w.theme} / {w.color} / {w.role} / {w.variation} —{" "}
              </span>
              {w.warning}
            </div>
          ))}
        </div>
      )}
      {errors.notices.length > 0 && (
        <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#60a5fa", marginBottom: 4 }}>
            ℹ {errors.notices.length} notice{errors.notices.length > 1 ? "s" : ""}
          </div>
          {errors.notices.map((n, i) => (
            <div key={i} style={{ fontSize: 10, color: "#bfdbfe", marginBottom: 2 }}>
              <span style={{ color: "#1e3a5f" }}>
                {n.theme} / {n.color} / {n.role} / {n.variation} —{" "}
              </span>
              {n.notice}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
