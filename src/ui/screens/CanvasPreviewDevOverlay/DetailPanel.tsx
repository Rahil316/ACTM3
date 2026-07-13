import { normalizeHex } from "../../components/preview";
import type { DetailItem, SourceDetail, ScaleDetail, TokenDetail } from "./types";

// ── Detail panel ──────────────────────────────────────────────────────────────

export function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 10 }}>
      <span style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span
        style={{
          fontSize: 10,
          color: "#e4e4e7",
          fontFamily: mono ? "monospace" : undefined,
          wordBreak: "break-all",
          lineHeight: 1.4,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function ColorChip({ hex }: { hex: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          background: hex,
          border: "1px solid rgba(255,255,255,0.12)",
          flexShrink: 0,
        }}
      />
      <span style={{ fontFamily: "monospace", fontSize: 12, color: "#f4f4f5", fontWeight: 600 }}>{normalizeHex(hex)}</span>
    </div>
  );
}

export function DetailPanel({ item, onClose }: { item: DetailItem; onClose: () => void }) {
  const kindLabel = item.kind === "source" ? "Source Color" : item.kind === "scale" ? "Scale Step" : "Role Token";

  const kindColor = item.kind === "source" ? "#34d399" : item.kind === "scale" ? "#60a5fa" : "#f59e0b";

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        background: "#0c0c0e",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: kindColor,
            }}
          >
            {kindLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#52525b",
            fontSize: 14,
            cursor: "pointer",
            lineHeight: 1,
            padding: "0 2px",
          }}
        >
          ×
        </button>
      </div>

      {/* Panel body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {/* Color chip */}
        {item.kind !== "scale" || item.hex ? <ColorChip hex={(item as SourceDetail | TokenDetail).hex ?? (item as ScaleDetail).hex ?? "#888"} /> : <div style={{ marginBottom: 14, fontSize: 10, color: "#52525b" }}>No hex resolved</div>}

        {/* ── Source ── */}
        {item.kind === "source" && (
          <>
            <DetailRow label="Color name" value={item.colorName} />
            <DetailRow label="Color ID" value={item.colorId} mono />
            <div
              style={{
                background: "rgba(167,139,250,0.08)",
                border: "1px solid rgba(167,139,250,0.2)",
                borderRadius: 6,
                padding: "8px 10px",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 9, color: "#a78bfa", marginBottom: 4, fontWeight: 600 }}>Figma pluginData ref</div>
              <code style={{ fontSize: 10, color: "#c4b5fd", wordBreak: "break-all" }}>{item.pluginDataRef}</code>
            </div>
            <DetailRow label="Figma collection" value={item.figmaCollection} mono />
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contrast vs themes</span>
              {item.contrastVsThemes.map((ct) => (
                <div key={ct.theme} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: ct.bg,
                      border: "1px solid rgba(255,255,255,0.1)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 10, color: "#a1a1aa", flex: 1 }}>{ct.theme}</span>
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: "#e4e4e7" }}>{ct.ratio}</span>
                </div>
              ))}
            </div>
            {item.alphaRefs.length > 0 && (
              <div>
                <span style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Alpha variant refs</span>
                {item.alphaRefs.map((a) => (
                  <div key={a.opacity} style={{ marginTop: 5 }}>
                    <div style={{ fontSize: 9, color: "#71717a" }}>{a.opacity}% opacity</div>
                    <code style={{ fontSize: 9, color: "#c4b5fd", wordBreak: "break-all" }}>{a.pluginDataRef}</code>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Scale step ── */}
        {item.kind === "scale" && (
          <>
            <DetailRow label="Color name" value={item.colorName} />
            <DetailRow label="Step" value={item.step} />
            <div
              style={{
                background: "rgba(96,165,250,0.08)",
                border: "1px solid rgba(96,165,250,0.2)",
                borderRadius: 6,
                padding: "8px 10px",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 9, color: "#60a5fa", marginBottom: 4, fontWeight: 600 }}>Figma pluginData ref</div>
              <code style={{ fontSize: 10, color: "#93c5fd", wordBreak: "break-all" }}>{item.pluginDataRef}</code>
            </div>
            <DetailRow label="Figma collection" value={item.figmaCollection} mono />
            <DetailRow label="Color ID" value={item.colorId} mono />
            {item.contrastVsThemes.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contrast vs themes</span>
                {item.contrastVsThemes.map((ct) => (
                  <div key={ct.theme} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                    <span style={{ fontSize: 10, color: "#a1a1aa", flex: 1 }}>{ct.theme}</span>
                    <span style={{ fontSize: 10, fontFamily: "monospace", color: "#e4e4e7" }}>{ct.ratio}</span>
                  </div>
                ))}
              </div>
            )}
            {item.engineEntry && (
              <div>
                <span style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Raw engine entry</span>
                <pre
                  style={{
                    marginTop: 6,
                    fontSize: 9,
                    color: "#71717a",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 4,
                    padding: "6px 8px",
                    overflow: "auto",
                    maxHeight: 160,
                    wordBreak: "break-all",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {JSON.stringify(item.engineEntry, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}

        {/* ── Role token ── */}
        {item.kind === "token" && (
          <>
            <DetailRow label="Theme" value={item.themeName} />
            <DetailRow label="Color" value={item.colorName} />
            <DetailRow label="Role" value={item.roleName} />
            <DetailRow label="Variation" value={item.varName} />
            <div
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 6,
                padding: "8px 10px",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 9, color: "#f59e0b", marginBottom: 4, fontWeight: 600 }}>Figma pluginData ref</div>
              <code style={{ fontSize: 10, color: "#fcd34d", wordBreak: "break-all" }}>{item.pluginDataRef}</code>
            </div>
            <DetailRow label="Figma collection" value={item.figmaCollection} mono />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              <DetailRow label="Color ID" value={item.colorId} mono />
              <DetailRow label="Role ID" value={item.roleId} mono />
              <DetailRow label="Variation ID" value={item.varId} mono />
              {item.scaleStep && <DetailRow label="Mapped scale step" value={item.scaleStep} mono />}
            </div>
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contrast vs theme BG</span>
              <div style={{ marginTop: 5, display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#f4f4f5" }}>{item.contrastRatio}</span>
                {item.contrastRating && (
                  <span
                    style={{
                      fontSize: 10,
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 3,
                      padding: "1px 5px",
                      color: "#a1a1aa",
                    }}
                  >
                    {item.contrastRating}
                  </span>
                )}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 9, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Raw engine token</span>
              <pre
                style={{
                  marginTop: 6,
                  fontSize: 9,
                  color: "#71717a",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 4,
                  padding: "6px 8px",
                  overflow: "auto",
                  maxHeight: 200,
                  wordBreak: "break-all",
                  whiteSpace: "pre-wrap",
                }}
              >
                {JSON.stringify(item.engineToken, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
