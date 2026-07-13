import { useState } from "react";
import { contrastRatioColor } from "../../utils/engine";

// ── Colour helpers ────────────────────────────────────────────────────────────

function swatchBorder(hex: string): string {
  const h = hex.replace(/^#/, "").padEnd(6, "0");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 0xff,
    g = (n >> 8) & 0xff,
    b = n & 0xff;
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  return lum > 200 ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.12)";
}

// ── Tree primitives ───────────────────────────────────────────────────────────

export const INDENT = 18;

export type NodeStatus = "ok" | "warn" | "error" | "adjusted" | "notice";

const STATUS_BG: Record<NodeStatus, string> = {
  ok: "transparent",
  warn: "rgba(251,191,36,0.08)",
  error: "rgba(248,113,113,0.1)",
  adjusted: "rgba(167,139,250,0.07)",
  notice: "rgba(96,165,250,0.07)",
};
const STATUS_BORDER: Record<NodeStatus, string> = {
  ok: "transparent",
  warn: "rgba(251,191,36,0.3)",
  error: "rgba(248,113,113,0.35)",
  adjusted: "rgba(167,139,250,0.3)",
  notice: "rgba(96,165,250,0.25)",
};
const STATUS_ICON: Record<NodeStatus, string> = {
  ok: "",
  warn: "⚠",
  error: "✕",
  adjusted: "↺",
  notice: "ℹ",
};
const STATUS_ICON_COLOR: Record<NodeStatus, string> = {
  ok: "transparent",
  warn: "#fbbf24",
  error: "#f87171",
  adjusted: "#a78bfa",
  notice: "#60a5fa",
};

export function TreeRow({ depth, label, status = "ok", meta, hex, children, defaultOpen = false, tag }: { depth: number; label: string; status?: NodeStatus; meta?: React.ReactNode; hex?: string; children?: React.ReactNode; defaultOpen?: boolean; tag?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = children;

  return (
    <div>
      <div
        onClick={hasChildren ? () => setOpen((o) => !o) : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          paddingLeft: depth * INDENT + 8,
          paddingRight: 8,
          paddingTop: 3,
          paddingBottom: 3,
          cursor: hasChildren ? "pointer" : "default",
          borderRadius: 4,
          background: STATUS_BG[status],
          border: `1px solid ${status !== "ok" ? STATUS_BORDER[status] : "transparent"}`,
          marginBottom: 1,
          minHeight: 24,
          boxSizing: "border-box",
        }}
      >
        <span style={{ width: 10, fontSize: 8, color: "#52525b", flexShrink: 0, userSelect: "none", lineHeight: 1 }}>{hasChildren ? (open ? "▼" : "▶") : ""}</span>

        {status !== "ok" && <span style={{ fontSize: 9, color: STATUS_ICON_COLOR[status], flexShrink: 0, lineHeight: 1 }}>{STATUS_ICON[status]}</span>}

        {hex && (
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: hex,
              border: `1px solid ${swatchBorder(hex)}`,
              flexShrink: 0,
            }}
          />
        )}

        <span
          style={{
            fontSize: 11,
            color: status === "error" ? "#f87171" : status === "warn" ? "#fbbf24" : "#e4e4e7",
            fontWeight: depth === 0 ? 700 : depth === 1 ? 600 : 400,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>

        {tag && (
          <span
            style={{
              fontSize: 9,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 3,
              padding: "0 4px",
              color: "#71717a",
              flexShrink: 0,
            }}
          >
            {tag}
          </span>
        )}

        {meta && <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>{meta}</div>}
      </div>

      {hasChildren && open && <div>{children}</div>}
    </div>
  );
}

export function Field({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
      <span style={{ fontSize: 9, color: "#52525b", width: 110, flexShrink: 0, textAlign: "right" }}>{label}</span>
      <span style={{ fontSize: 10, color: color ?? "#a1a1aa", fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

export function FieldBlock({ depth, children }: { depth: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        paddingLeft: depth * INDENT + 18,
        paddingTop: 4,
        paddingBottom: 6,
        paddingRight: 8,
        background: "rgba(255,255,255,0.025)",
        borderRadius: 4,
        marginBottom: 2,
      }}
    >
      {children}
    </div>
  );
}

export function ContrastRow({ themeKey, ratio, rating }: { themeKey: string; ratio: number | null; rating: string | null }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
      <span style={{ fontSize: 9, color: "#52525b", width: 110, flexShrink: 0, textAlign: "right" }}>contrast:{themeKey}</span>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: contrastRatioColor(ratio) }}>
        {ratio != null ? `${ratio.toFixed(2)}:1` : "—"}
        {rating ? ` ${rating}` : ""}
      </span>
    </div>
  );
}
