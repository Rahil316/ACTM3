import type { TreeViewMode } from "./types";

// ── Mode toggle ───────────────────────────────────────────────────────────────

export function ModeToggle({ mode, onChange }: { mode: TreeViewMode; onChange: (m: TreeViewMode) => void }) {
  return (
    <div
      style={{
        display: "flex",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {(["flat", "tree"] as TreeViewMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            background: mode === m ? "rgba(167,139,250,0.2)" : "transparent",
            border: "none",
            borderRight: m === "flat" ? "1px solid rgba(255,255,255,0.1)" : "none",
            color: mode === m ? "#c4b5fd" : "#52525b",
            fontSize: 10,
            fontWeight: mode === m ? 600 : 400,
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {m === "flat" ? "Flat" : "Tree"}
        </button>
      ))}
    </div>
  );
}
