import { getInkMode, inkColor } from "../../components/preview";

// ── Shared primitive components ───────────────────────────────────────────────

export function Swatch({ hex, size = 32, label, onClick, selected }: { hex: string; size?: number; label?: string; onClick?: () => void; selected?: boolean }) {
  const mode = getInkMode(hex);
  return (
    <div
      onClick={onClick}
      title={label ?? hex}
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: hex,
        border: selected ? "2px solid #a78bfa" : "1px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
        display: "flex",
        alignItems: "flex-end",
        padding: 2,
        boxSizing: "border-box",
        cursor: onClick ? "pointer" : undefined,
        outline: selected ? "2px solid rgba(167,139,250,0.4)" : undefined,
        outlineOffset: 2,
      }}
    >
      {label && <span style={{ fontSize: 8, color: inkColor(mode, 0.7), lineHeight: 1, wordBreak: "break-all" }}>{label}</span>}
    </div>
  );
}

export function Badge({ children, color = "#a78bfa" }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: "monospace",
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 3,
        padding: "1px 4px",
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#a78bfa",
        margin: "0 0 12px",
        paddingBottom: 6,
        borderBottom: "1px solid rgba(167,139,250,0.2)",
      }}
    >
      {children}
    </h2>
  );
}
