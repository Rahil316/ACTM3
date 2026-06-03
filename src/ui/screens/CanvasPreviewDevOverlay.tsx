/**
 * CanvasPreviewDevOverlay — browser-side mirror of canvasPreview.ts
 *
 * Renders Source Colors, Color Scales, and Role Tokens as HTML so you can
 * validate engine output without running the Figma plugin.
 *
 * Open with: Alt+Shift+P
 * Click any swatch / step / token tile to inspect its full reference + storage info.
 */

import { useMemo, useEffect, useRef, useState } from "react";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { variableMaker, resolveTokenRefBgs, translateLocalBg, contrastRatio, contrastRating } from "../lib/colorEngine";
import { getInkMode, inkColor, normalizeHex } from "../components/preview";
import type { ProjectStore } from "../types/state";
import { CanvasPreviewDevTree } from "./CanvasPreviewDevTree";

// ── Detail panel payload ──────────────────────────────────────────────────────

type SourceDetail = {
  kind: "source";
  colorName: string;
  colorId: string;
  hex: string;
  pluginDataRef: string; // tokenRef stored in Figma variable pluginData
  figmaCollection: string;
  contrastVsThemes: { theme: string; bg: string; ratio: string }[];
  alphaRefs: { opacity: number; pluginDataRef: string }[];
};

type ScaleDetail = {
  kind: "scale";
  colorName: string;
  colorId: string;
  step: string;
  hex: string | null;
  pluginDataRef: string;
  figmaCollection: string;
  contrastVsThemes: { theme: string; ratio: string }[];
  // raw engine entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engineEntry: any;
};

type TokenDetail = {
  kind: "token";
  colorName: string;
  colorId: string;
  roleName: string;
  roleId: string;
  varName: string;
  varId: string;
  themeName: string;
  hex: string;
  pluginDataRef: string; // tokenRef stored in Figma variable pluginData
  figmaCollection: string;
  scaleStep: string | null;
  contrastRatio: string;
  contrastRating: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  engineToken: any;
};

type DetailItem = SourceDetail | ScaleDetail | TokenDetail;

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function isColorDark(hex: string): boolean {
  const h = hex.replace(/^#/, "").padEnd(6, "0").slice(0, 6);
  const n = parseInt(h, 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function contrastStr(hex1: string, hex2: string): string {
  const ratio = contrastRatio(hex1, hex2);
  if (ratio == null) return "—";
  const rating = contrastRating(hex1, hex2) ?? "";
  return `${ratio.toFixed(1)}:1 ${rating}`.trim();
}

// ── Console logging ───────────────────────────────────────────────────────────

function logSection(title: string, data: unknown) {
  console.group(`%c[CanvasPreviewDev] ${title}`, "color:#a78bfa;font-weight:bold");
  console.log(data);
  console.groupEnd();
}

function logValidation(label: string, pass: boolean, detail?: string) {
  const icon = pass ? "✅" : "❌";
  const style = pass ? "color:#34d399" : "color:#f87171";
  console.log(`%c${icon} ${label}${detail ? ` — ${detail}` : ""}`, style);
}

// ── Build engine config ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildConfig(projectStore: ProjectStore): any {
  return {
    colors: projectStore.colors.map((c) => ({
      _id: c._id,
      name: c.name,
      value: c.value,
      shorthand: c.shorthand ?? "",
      description: c.description ?? "",
      scaleAlgorithm: c.scaleAlgorithm,
      solverMode: c.solverMode,
    })),
    themes: projectStore.themes.map((t) => ({ name: t.name, bg: t.bg })),
    scaleLength: projectStore.scaleLength,
    scaleSteps: projectStore.scaleSteps?.map((s) => s.name) ?? undefined,
    scaleAlgorithm: projectStore.scaleAlgorithm,
    pluginMode: projectStore.pluginMode,
    roles: projectStore.roles.map((r) => {
      const { localBg, localBgTokenRef, localBgDynamicRef } = translateLocalBg(r.localBg, projectStore.colors, projectStore.themes);
      return {
        name: r.name,
        shorthand: r.shorthand ?? "",
        mappingMethod: r.mappingMethod,
        variations: r.variations,
        solverMode: r.solverMode,
        description: r.description,
        scopedColorIds: r.scopedColorIds,
        localBg,
        localBgTokenRef,
        localBgDynamicRef,
      };
    }),
    variations: projectStore.variations ?? [],
    tokenNameSegments: projectStore.tokenNameSegments,
    useShorthandColors: projectStore.useShorthandColors,
    useShorthandRoles: projectStore.useShorthandRoles,
    useShorthandVariations: projectStore.useShorthandVariations,
    useShorthandSteps: projectStore.useShorthandSteps,
    alphaValues: projectStore.alphaValues?.length ? projectStore.alphaValues : [10, 25, 50, 75, 90],
    includeSourceColors: projectStore.includeSourceColors ?? false,
    includeColorScalesCollection: projectStore.includeColorScalesCollection !== false,
  };
}

// ── Shared primitive components ───────────────────────────────────────────────

function Swatch({ hex, size = 32, label, onClick, selected }: { hex: string; size?: number; label?: string; onClick?: () => void; selected?: boolean }) {
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

function Badge({ children, color = "#a78bfa" }: { children: React.ReactNode; color?: string }) {
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

function SectionTitle({ children }: { children: React.ReactNode }) {
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

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
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

function ColorChip({ hex }: { hex: string }) {
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

function DetailPanel({ item, onClose }: { item: DetailItem; onClose: () => void }) {
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

// ── Section A: Source Colors ──────────────────────────────────────────────────

function SourceColorsSection({ projectStore, onSelect, selectedRef }: { projectStore: ProjectStore; onSelect: (item: DetailItem) => void; selectedRef: string | null }) {
  const alphaValues: number[] = projectStore.alphaValues?.length ? projectStore.alphaValues : [10, 25, 50, 75, 90];

  const sourceCollection = projectStore.sourceCollectionName || "_constants";

  useEffect(() => {
    logSection("Source Colors", {
      colors: projectStore.colors.map((c) => ({ name: c.name, value: c.value })),
      alphaValues,
      themes: projectStore.themes.map((t) => ({ name: t.name, bg: t.bg })),
    });
    projectStore.colors.forEach((color) => {
      logValidation(`Source: ${color.name}`, color.value, color.value);
      projectStore.themes.forEach((theme) => {
        const ratio = contrastRatio(color.value, theme.bg);
        logValidation(`  Contrast ${color.name} vs ${theme.name}`, ratio != null && ratio >= 1, ratio != null ? `${ratio.toFixed(1)}:1` : "null");
      });
    });
  }, []);

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle>Source Colors ({projectStore.colors.length})</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {projectStore.colors.map((color) => {
          const ref = `source:${color._id}`;
          const isSelected = selectedRef === ref;
          return (
            <div
              key={color._id}
              onClick={() =>
                onSelect({
                  kind: "source",
                  colorName: color.name,
                  colorId: color._id,
                  hex: color.value,
                  pluginDataRef: ref,
                  figmaCollection: sourceCollection,
                  contrastVsThemes: projectStore.themes.map((t) => ({
                    theme: t.name,
                    bg: t.bg,
                    ratio: contrastStr(color.value, t.bg),
                  })),
                  alphaRefs: alphaValues.map((a) => ({
                    opacity: a,
                    pluginDataRef: `source:${color._id}/${a}`,
                  })),
                })
              }
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                cursor: "pointer",
                borderRadius: 6,
                padding: "6px 8px",
                background: isSelected ? "rgba(167,139,250,0.1)" : "transparent",
                border: isSelected ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent",
                transition: "background 0.1s",
              }}
            >
              <Swatch hex={color.value} size={40} selected={isSelected} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#f4f4f5" }}>{color.name}</span>
                <Badge>{normalizeHex(color.value)}</Badge>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {projectStore.themes.map((theme) => (
                    <Badge key={theme.name} color="#94a3b8">
                      {theme.name} {contrastStr(color.value, theme.bg)}
                    </Badge>
                  ))}
                </div>
                {alphaValues.length > 0 && (
                  <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                    {alphaValues.map((a) => (
                      <Swatch key={a} hex={color.value} size={20} label={`${a}%`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section B: Color Scales ───────────────────────────────────────────────────

function ColorScalesSection({
  projectStore,
  result,
  onSelect,
  selectedRef,
}: {
  projectStore: ProjectStore;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  onSelect: (item: DetailItem) => void;
  selectedRef: string | null;
}) {
  const stepNames: string[] = useMemo(() => {
    if (Array.isArray(projectStore.scaleSteps) && projectStore.scaleSteps.length > 0) {
      return projectStore.scaleSteps.map((s) => s.name);
    }
    const len = projectStore.scaleLength ?? 23;
    return Array.from({ length: len }, (_, i) => String(i + 1));
  }, [projectStore]);

  const scaleCollection = projectStore.scaleCollectionName || "_scale";

  useEffect(() => {
    logSection("Color Scales", { colors: projectStore.colors.length, steps: stepNames.length });
    projectStore.colors.forEach((color) => {
      const missing = stepNames.filter((s) => !result?.scales?.[color.name]?.[s]);
      logValidation(`Scale: ${color.name} (${stepNames.length - missing.length}/${stepNames.length} steps)`, missing.length === 0, missing.length > 0 ? `missing: ${missing.join(", ")}` : undefined);
    });
  }, []);

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle>
        Color Scales — {projectStore.colors.length} colors × {stepNames.length} steps
      </SectionTitle>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {projectStore.colors.map((color) => (
          <div key={color._id}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>{color.name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {stepNames.map((step) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const entry = result?.scales?.[color.name]?.[step] as any;
                const hex = entry && typeof entry === "object" ? entry.value : (entry as string) || null;
                const stepId = projectStore.scaleSteps?.find((s) => s.name === step)?._id ?? step;
                const ref = `scale:${color._id}/${stepId}`;
                const isSelected = selectedRef === ref;

                const contrastVsThemes = projectStore.themes.map((t) => ({
                  theme: t.name,
                  ratio: hex ? contrastStr(hex, t.bg) : "—",
                }));

                return (
                  <div
                    key={step}
                    onClick={() =>
                      onSelect({
                        kind: "scale",
                        colorName: color.name,
                        colorId: color._id,
                        step,
                        hex,
                        pluginDataRef: ref,
                        figmaCollection: scaleCollection,
                        contrastVsThemes,
                        engineEntry: entry,
                      })
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      borderRadius: 3,
                      padding: "1px 3px",
                      background: isSelected ? "rgba(96,165,250,0.12)" : "transparent",
                      border: isSelected ? "1px solid rgba(96,165,250,0.3)" : "1px solid transparent",
                    }}
                  >
                    <Swatch hex={hex ?? "#888"} size={20} selected={isSelected} />
                    <span style={{ fontSize: 9, color: "#71717a", width: 28, textAlign: "right" }}>{step}</span>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "#a1a1aa" }}>{hex ? normalizeHex(hex) : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section C: Role Tokens ────────────────────────────────────────────────────

function RoleTokensSection({
  projectStore,
  result,
  onSelect,
  selectedRef,
}: {
  projectStore: ProjectStore;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  onSelect: (item: DetailItem) => void;
  selectedRef: string | null;
}) {
  const tokenCollection = projectStore.tokenCollectionName || "color tokens";

  useEffect(() => {
    logSection("Role Tokens", result?.tokens ?? {});
    let totalTokens = 0;
    let missingTokens = 0;
    projectStore.themes.forEach((theme) => {
      const themeKey = theme.name.toLowerCase();
      const themeTokens = result?.tokens?.[themeKey] ?? {};
      Object.entries(themeTokens).forEach(([, roleMap]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.entries(roleMap as any).forEach(([, varMap]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.entries(varMap as any).forEach(([, token]) => {
            totalTokens++;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!(token as any)?.value) missingTokens++;
          });
        });
      });
      logValidation(`Theme: ${theme.name} — colors present`, Object.keys(themeTokens).length === projectStore.colors.length, `${Object.keys(themeTokens).length}/${projectStore.colors.length}`);
      Object.entries(themeTokens).forEach(([_colorName, colorRoles]) => {
        const roleCount = Object.keys((colorRoles as object) ?? {}).length;
        logValidation(`  ${theme.name} / ${_colorName} — roles`, roleCount > 0, `${roleCount} role(s)`);
      });
    });
    logValidation(`Total tokens generated`, missingTokens === 0, `${totalTokens} total, ${missingTokens} missing value`);
  }, []);

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle>Role Tokens — {projectStore.themes.length} theme(s)</SectionTitle>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {projectStore.themes.map((theme) => {
          const isBgDark = isColorDark(theme.bg);
          const onBg = isBgDark ? "#f4f4f5" : "#18181b";
          const onBgMuted = isBgDark ? "#a1a1aa" : "#52525b";
          const themeKey = theme.name.toLowerCase();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const themeTokens = (result?.tokens?.[themeKey] ?? {}) as Record<string, Record<string, Record<string, any>>>;

          return (
            <div
              key={theme.name}
              style={{
                background: theme.bg,
                borderRadius: 8,
                padding: 16,
                minWidth: 180,
                maxWidth: 300,
                border: "1px solid rgba(255,255,255,0.08)",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: onBg, marginBottom: 12 }}>{theme.name}</div>

              {Object.entries(themeTokens).map(([colorName, roleMap]) => {
                const colorObj = projectStore.colors.find((c) => c.name === colorName);
                return (
                  <div key={colorName} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: onBg, marginBottom: 6 }}>{colorName}</div>

                    {Object.entries(roleMap).map(([roleIdxStr, varMap]) => {
                      const roleIdx = parseInt(roleIdxStr, 10);
                      const roleObj = projectStore.roles[roleIdx];
                      if (!roleObj) return null;
                      const varDefs = roleObj.variations ?? projectStore.variations ?? [];

                      return (
                        <div key={roleIdxStr} style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 9, color: onBgMuted, marginBottom: 3 }}>{roleObj.name}</div>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {Object.entries(varMap).map(([varIdxStr, token]) => {
                              if (!token?.value) return null;
                              const varIdx = parseInt(varIdxStr, 10);
                              const varDef = varDefs[varIdx];
                              const ratio = token.contrast?.ratio;
                              const rating = token.contrast?.rating ?? "";
                              const ref = `token:${colorObj?._id}/${roleObj._id}/${varDef?._id}`;
                              const isSelected = selectedRef === ref;

                              return (
                                <div
                                  key={varIdxStr}
                                  onClick={() =>
                                    onSelect({
                                      kind: "token",
                                      colorName,
                                      colorId: colorObj?._id ?? "",
                                      roleName: roleObj.name,
                                      roleId: roleObj._id,
                                      varName: varDef?.name ?? String(varIdx),
                                      varId: varDef?._id ?? String(varIdx),
                                      themeName: theme.name,
                                      hex: token.value,
                                      pluginDataRef: ref,
                                      figmaCollection: tokenCollection,
                                      scaleStep: (token.scaleStep as string | undefined) ?? null,
                                      contrastRatio: ratio != null ? `${Number(ratio).toFixed(1)}:1` : "—",
                                      contrastRating: rating,
                                      engineToken: token,
                                    })
                                  }
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 2,
                                    cursor: "pointer",
                                    borderRadius: 4,
                                    padding: 2,
                                    outline: isSelected ? "2px solid #a78bfa" : "2px solid transparent",
                                    outlineOffset: 1,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 4,
                                      background: token.value,
                                      border: "1px solid rgba(0,0,0,0.15)",
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 8,
                                      color: onBgMuted,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {varDef?.name ?? varIdx}
                                  </span>
                                  {ratio != null && <span style={{ fontSize: 7, color: onBgMuted }}>{Number(ratio).toFixed(1)}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Mode toggle ───────────────────────────────────────────────────────────────

type ViewMode = "flat" | "tree";

function ModeToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
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
      {(["flat", "tree"] as ViewMode[]).map((m) => (
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

// ── Main overlay ──────────────────────────────────────────────────────────────

export function CanvasPreviewDevOverlay() {
  const projectStore = useProjectStore((s) => s.projectStore);
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<ViewMode>("flat");
  const [selectedItem, setSelectedItem] = useState<DetailItem | null>(null);

  const selectedRef = useMemo<string | null>(() => selectedItem?.pluginDataRef ?? null, [selectedItem]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = useMemo(() => buildConfig(projectStore) as any, [projectStore]);

  const result = useMemo(() => {
    try {
      const pass1 = variableMaker(config);
      if (resolveTokenRefBgs(config, pass1)) return variableMaker(config);
      return pass1;
    } catch (err) {
      console.error("[CanvasPreviewDev] Engine error:", err);
      return null;
    }
  }, [config]);

  const includeSource = projectStore.includeSourceColors === true;
  const includeScales = projectStore.includeColorScalesCollection !== false;

  useEffect(() => {
    console.clear();
    console.log("%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "color:#a78bfa;font-weight:bold");
    console.log("%c  CanvasPreviewDev — Token Wand output validation", "color:#a78bfa;font-size:13px;font-weight:bold");
    console.log("%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "color:#a78bfa;font-weight:bold");
    console.log(`Colors: ${projectStore.colors.length} | Roles: ${projectStore.roles.length} | Themes: ${projectStore.themes.length}`);
    logValidation("Engine result present", result);
    logValidation("Colors defined", projectStore.colors.length > 0, `${projectStore.colors.length}`);
    logValidation("Roles defined", projectStore.roles.length > 0, `${projectStore.roles.length}`);
    logValidation("Themes defined", projectStore.themes.length > 0, `${projectStore.themes.length}`);
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    console.group(`%c[CanvasPreviewDev] Selected — ${selectedItem.kind} — ${selectedItem.pluginDataRef}`, "color:#f59e0b;font-weight:bold");
    console.log(selectedItem);
    console.groupEnd();
  }, [selectedItem]);

  // Clear detail panel when switching modes
  const handleModeChange = (m: ViewMode) => {
    setMode(m);
    setSelectedItem(null);
  };

  const warningCount = result?.errors.warnings.length ?? 0;
  const criticalCount = result?.errors.critical.length ?? 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Inter, system-ui, sans-serif",
        color: "#f4f4f5",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "#0f0f11",
          gap: 10,
        }}
      >
        {/* Left: title + status badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", flexShrink: 0 }}>✦</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#f4f4f5", flexShrink: 0 }}>Canvas Preview Dev</span>
          <Badge color="#71717a">testing only</Badge>
          {criticalCount > 0 && <Badge color="#f87171">✕ {criticalCount} critical</Badge>}
          {warningCount > 0 && (
            <Badge color="#fbbf24">
              ⚠ {warningCount} warning{warningCount > 1 ? "s" : ""}
            </Badge>
          )}
          {mode === "flat" && selectedItem && (
            <Badge color="#f59e0b">
              {selectedItem.kind} · {selectedItem.pluginDataRef}
            </Badge>
          )}
        </div>

        {/* Centre: mode toggle */}
        <ModeToggle mode={mode} onChange={handleModeChange} />

        {/* Right: stats + close */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "#52525b" }}>
            {projectStore.colors.length}c · {projectStore.roles.length}r · {projectStore.themes.length}t
          </span>
          <button
            onClick={closeOverlay}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#a1a1aa",
              fontSize: 11,
              padding: "3px 10px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Close Esc
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {!result ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}>Engine returned no result — check the console for errors.</div>
        ) : mode === "flat" ? (
          <>
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {includeSource && projectStore.colors.length > 0 && <SourceColorsSection projectStore={projectStore} onSelect={setSelectedItem} selectedRef={selectedRef} />}
              {includeScales && <ColorScalesSection projectStore={projectStore} result={result} onSelect={setSelectedItem} selectedRef={selectedRef} />}
              <RoleTokensSection projectStore={projectStore} result={result} onSelect={setSelectedItem} selectedRef={selectedRef} />
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 9, color: "#3f3f46", textAlign: "center" }}>✦ Token Wand · Flat view · Click any tile to inspect · Open console for validation logs</div>
            </div>
            {selectedItem && <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />}
          </>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
            <CanvasPreviewDevTree projectStore={projectStore} config={config} result={result} />
          </div>
        )}
      </div>
    </div>
  );
}
