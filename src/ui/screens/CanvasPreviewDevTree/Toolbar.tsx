// ── Toolbar ───────────────────────────────────────────────────────────────────

export function Chip({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 4,
        border: `1px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
        background: active ? `${color}22` : "transparent",
        color: active ? color : "#52525b",
        cursor: "pointer",
        fontFamily: "Inter, system-ui, sans-serif",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

export function ToolbarBtn({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "#a1a1aa",
        cursor: "pointer",
        fontFamily: "Inter, system-ui, sans-serif",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}
