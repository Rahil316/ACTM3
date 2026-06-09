/**
 * CanvasPreviewDevTree — hierarchical inspector for engine output
 *
 * Mirrors the exact structure of EngineResult:
 *   Errors/Warnings summary
 *   └─ Scales  →  [Color]  →  [Step]
 *   └─ Tokens  →  [Theme]  →  [Color]  →  [Role]  →  [Variation]
 *
 * Controls:
 *   Expand all / Collapse all — remounts tree with new defaultOpen value
 *   Filter bar — by color name, role name, warnings-only, errors-only
 */

import { useState, useMemo } from "react";
import { normalizeHex } from "../components/preview";
import type { ProjectStore } from "../types/state";
import type { EngineResult, TokenEntry, ScaleStepToken } from "../types/state";

// ── Colour helpers ────────────────────────────────────────────────────────────

function contrastColor(ratio: number | null): string {
  if (ratio == null) return "#52525b";
  if (ratio >= 7) return "#34d399";
  if (ratio >= 4.5) return "#86efac";
  if (ratio >= 3) return "#fbbf24";
  return "#f87171";
}

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

const INDENT = 18;

type NodeStatus = "ok" | "warn" | "error" | "adjusted" | "notice";

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

function TreeRow({ depth, label, status = "ok", meta, hex, children, defaultOpen = false, tag }: { depth: number; label: string; status?: NodeStatus; meta?: React.ReactNode; hex?: string; children?: React.ReactNode; defaultOpen?: boolean; tag?: string }) {
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

function Field({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
      <span style={{ fontSize: 9, color: "#52525b", width: 110, flexShrink: 0, textAlign: "right" }}>{label}</span>
      <span style={{ fontSize: 10, color: color ?? "#a1a1aa", fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function FieldBlock({ depth, children }: { depth: number; children: React.ReactNode }) {
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

function ContrastRow({ themeKey, ratio, rating }: { themeKey: string; ratio: number | null; rating: string | null }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 2 }}>
      <span style={{ fontSize: 9, color: "#52525b", width: 110, flexShrink: 0, textAlign: "right" }}>contrast:{themeKey}</span>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: contrastColor(ratio) }}>
        {ratio != null ? `${ratio.toFixed(2)}:1` : "—"}
        {rating ? ` ${rating}` : ""}
      </span>
    </div>
  );
}

// ── Errors summary banner ─────────────────────────────────────────────────────

function ErrorsBanner({ errors }: { errors: EngineResult["errors"] }) {
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

// ── Tree leaf / branch nodes ──────────────────────────────────────────────────

function ScaleStepNode({ stepKey, step, depth }: { stepKey: string; step: ScaleStepToken; depth: number }) {
  const hex = step.value;
  return (
    <TreeRow depth={depth} label={stepKey} hex={hex} defaultOpen={false} meta={<span style={{ fontSize: 9, fontFamily: "monospace", color: "#71717a" }}>{normalizeHex(hex)}</span>}>
      <FieldBlock depth={depth}>
        <Field label="value" value={normalizeHex(hex)} mono color="#c4b5fd" />
        <Field label="stepName" value={step.stepName} mono />
        <Field label="shorthand" value={step.shorthand} mono />
        {step.description && <Field label="description" value={step.description} />}
        {Object.entries(step.contrast).map(([k, c]) => (
          <ContrastRow key={k} themeKey={k} ratio={c.ratio} rating={c.rating} />
        ))}
      </FieldBlock>
    </TreeRow>
  );
}

function TokenEntryNode({ varName, token, depth, warnings, notices }: { varName: string; token: TokenEntry; depth: number; warnings: EngineResult["errors"]["warnings"]; notices: EngineResult["errors"]["notices"] }) {
  const ratio = token.contrast.ratio;
  const myWarnings = warnings.filter((w) => w.variation === token.variation && w.role === token.role);
  const myNotices = notices.filter((n) => n.variation === token.variation && n.role === token.role);

  const status: NodeStatus = myWarnings.length > 0 ? "warn" : token.isAdjusted ? "adjusted" : myNotices.length > 0 ? "notice" : "ok";

  return (
    <TreeRow
      depth={depth}
      label={varName}
      hex={token.value}
      status={status}
      defaultOpen={false}
      tag={token.isAdjusted ? "adjusted" : undefined}
      meta={<span style={{ fontSize: 9, fontFamily: "monospace", color: contrastColor(ratio) }}>{ratio != null ? `${ratio.toFixed(1)}:1` : "—"}</span>}
    >
      <FieldBlock depth={depth}>
        <Field label="value" value={normalizeHex(token.value)} mono color="#fcd34d" />
        <Field label="tokenName" value={token.tokenName} mono />
        <Field label="tokenRef" value={token.tokenRef ?? "—"} mono />
        <Field label="variation" value={token.variation} />
        <Field label="role" value={token.role} />
        <Field label="color" value={token.color} />
        {token.roleDescription && <Field label="roleDescription" value={token.roleDescription} />}
        {token.contrastTarget != null && <Field label="contrastTarget" value={`${token.contrastTarget}:1`} mono color={ratio != null && ratio >= token.contrastTarget ? "#34d399" : "#f87171"} />}
        <ContrastRow themeKey="bg" ratio={ratio} rating={token.contrast.rating} />
        {token.isAdjusted && <Field label="isAdjusted" value="true — engine fell back to closest available step" color="#a78bfa" />}
        {myWarnings.map((w, i) => (
          <Field key={i} label={`warning ${i + 1}`} value={w.warning} color="#fbbf24" />
        ))}
        {myNotices.map((n, i) => (
          <Field key={i} label={`notice ${i + 1}`} value={n.notice} color="#60a5fa" />
        ))}
      </FieldBlock>
    </TreeRow>
  );
}

function RoleNode({
  roleName,
  roleIdx,
  varMap,
  depth,
  projectStore,
  result,
  colorName,
  themeName,
}: {
  roleName: string;
  roleIdx: number;
  varMap: Record<number, TokenEntry>;
  depth: number;
  projectStore: ProjectStore;
  result: EngineResult;
  colorName: string;
  themeName: string;
}) {
  const entries = Object.entries(varMap);
  const roleObj = projectStore.roles[roleIdx];
  const varDefs = roleObj?.variations ?? projectStore.variations ?? [];

  const hasWarn = result.errors.warnings.some((w) => w.role === roleName && w.color === colorName && w.theme === themeName);
  const hasAdjusted = entries.some(([, t]) => t.isAdjusted);
  const hasNotice = result.errors.notices.some((n) => n.role === roleName && n.color === colorName && n.theme === themeName);
  const status: NodeStatus = hasWarn ? "warn" : hasAdjusted ? "adjusted" : hasNotice ? "notice" : "ok";
  const firstHex = entries.find(([, t]) => t.value)?.[1]?.value;

  return (
    <TreeRow depth={depth} label={roleName} hex={firstHex} status={status} defaultOpen={false} tag={`${entries.length} var${entries.length !== 1 ? "s" : ""}`}>
      {entries.map(([varIdxStr, token]) => {
        const varDef = varDefs[parseInt(varIdxStr, 10)];
        return (
          <TokenEntryNode
            key={varIdxStr}
            varName={varDef?.name ?? `var-${varIdxStr}`}
            token={token}
            depth={depth + 1}
            warnings={result.errors.warnings.filter((w) => w.color === colorName && w.role === roleName && w.theme === themeName)}
            notices={result.errors.notices.filter((n) => n.color === colorName && n.role === roleName && n.theme === themeName)}
          />
        );
      })}
    </TreeRow>
  );
}

function ThemeColorNode({
  colorName,
  roleMap,
  depth,
  projectStore,
  result,
  themeName,
  visibleRoles,
}: {
  colorName: string;
  roleMap: Record<number, Record<number, TokenEntry>>;
  depth: number;
  projectStore: ProjectStore;
  result: EngineResult;
  themeName: string;
  visibleRoles: Set<string> | null;
}) {
  const colorObj = projectStore.colors.find((c) => c.name === colorName);
  const roleEntries = Object.entries(roleMap).filter(([roleIdxStr]) => {
    if (!visibleRoles) return true;
    const roleObj = projectStore.roles[parseInt(roleIdxStr, 10)];
    return roleObj && visibleRoles.has(roleObj.name);
  });
  const tokenCount = roleEntries.reduce((acc, [, vm]) => acc + Object.keys(vm).length, 0);

  const hasWarn = result.errors.warnings.some((w) => w.color === colorName && w.theme === themeName);
  const hasAdjusted = roleEntries.some(([, vm]) => Object.values(vm).some((t) => t.isAdjusted));
  const status: NodeStatus = hasWarn ? "warn" : hasAdjusted ? "adjusted" : "ok";

  if (roleEntries.length === 0) return null;

  return (
    <TreeRow depth={depth} label={colorName} hex={colorObj?.value} status={status} defaultOpen={false} tag={`${tokenCount} token${tokenCount !== 1 ? "s" : ""}`}>
      {roleEntries.map(([roleIdxStr, varMap]) => {
        const roleIdx = parseInt(roleIdxStr, 10);
        const roleObj = projectStore.roles[roleIdx];
        return <RoleNode key={roleIdxStr} roleName={roleObj?.name ?? `role-${roleIdx}`} roleIdx={roleIdx} varMap={varMap} depth={depth + 1} projectStore={projectStore} result={result} colorName={colorName} themeName={themeName} />;
      })}
    </TreeRow>
  );
}

// ── Config tree ───────────────────────────────────────────────────────────────

function ConfigTree({ config, expandAll }: { config: ProjectStore; expandAll: boolean }) {
  return (
    <TreeRow depth={0} label="Config" defaultOpen={expandAll} tag={`${config.colors.length}c · ${config.roles.length}r · ${config.themes.length}t`}>
      {/* Global settings */}
      <TreeRow depth={1} label="Global" defaultOpen={expandAll}>
        <FieldBlock depth={1}>
          <Field label="pluginMode" value={config.pluginMode} />
          <Field label="scaleAlgorithm" value={config.scaleAlgorithm} />
          <Field label="scaleLength" value={String(config.scaleLength)} mono />
          <Field label="solverMode" value={config.solverMode ?? "—"} />
          <Field label="useUniformAlgorithm" value={String(config.useUniformAlgorithm ?? false)} />
          <Field label="algorithmScopeLevel" value={config.algorithmScopeLevel ?? "—"} />
          {config.scaleSteps && config.scaleSteps.length > 0 && <Field label="scaleSteps" value={config.scaleSteps.join(", ")} mono />}
        </FieldBlock>
      </TreeRow>

      {/* Colors */}
      <TreeRow depth={1} label="Colors" defaultOpen={expandAll} tag={`${config.colors.length}`}>
        {config.colors.map((c) => (
          <TreeRow key={c._id ?? c.name} depth={2} label={c.name} hex={c.value} defaultOpen={expandAll}>
            <FieldBlock depth={2}>
              <Field label="value" value={c.value} mono color="#c4b5fd" />
              <Field label="shorthand" value={c.shorthand || "—"} mono />
              <Field label="scaleAlgorithm" value={c.scaleAlgorithm ?? "inherited"} />
              <Field label="solverMode" value={c.solverMode ?? "inherited"} />
              {c.description && <Field label="description" value={c.description} />}
              {c._id && <Field label="_id" value={c._id} mono />}
            </FieldBlock>
          </TreeRow>
        ))}
      </TreeRow>

      {/* Themes */}
      <TreeRow depth={1} label="Themes" defaultOpen={expandAll} tag={`${config.themes.length}`}>
        {config.themes.map((t) => (
          <TreeRow key={t.name} depth={2} label={t.name} hex={t.bg} defaultOpen={false}>
            <FieldBlock depth={2}>
              <Field label="bg" value={t.bg} mono color="#86efac" />
            </FieldBlock>
          </TreeRow>
        ))}
      </TreeRow>

      {/* Roles */}
      <TreeRow depth={1} label="Roles" defaultOpen={expandAll} tag={`${config.roles.length}`}>
        {config.roles.map((r, i) => (
          <TreeRow key={r.name + i} depth={2} label={r.name} defaultOpen={false}>
            <FieldBlock depth={2}>
              <Field label="shorthand" value={r.shorthand || "—"} mono />
              <Field label="mappingMethod" value={r.mappingMethod ?? "contrast"} />
              <Field label="solverMode" value={r.solverMode ?? "inherited"} />
              <Field label="scaleAlgorithm" value={r.scaleAlgorithm ?? "inherited"} />
              {r.description && <Field label="description" value={r.description} />}
              {r.variations && <Field label="variations" value={r.variations.map((v) => `${v.name}(${v.target})`).join(", ")} />}
              {r.scopedColorIds && r.scopedColorIds.length > 0 && <Field label="scopedColorIds" value={r.scopedColorIds.join(", ")} mono />}
              {r.localBg && (
                <Field
                  label="localBg"
                  value={Object.entries(r.localBg)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(", ")}
                  mono
                />
              )}
            </FieldBlock>
          </TreeRow>
        ))}
      </TreeRow>

      {/* Variations */}
      <TreeRow depth={1} label="Variations" defaultOpen={expandAll} tag={`${config.variations?.length}`}>
        {config.variations?.map((v, i) => (
          <TreeRow key={v.name + i} depth={2} label={v.name} defaultOpen={false}>
            <FieldBlock depth={2}>{v.shorthand && <Field label="shorthand" value={v.shorthand} mono />}</FieldBlock>
          </TreeRow>
        ))}
      </TreeRow>
    </TreeRow>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

type FilterChip = "warnings" | "errors" | "adjusted";

function Chip({ label, active, color, onClick }: { label: string; active: boolean; color: string; onClick: () => void }) {
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

function ToolbarBtn({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
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

// ── Main tree view ────────────────────────────────────────────────────────────

export function CanvasPreviewDevTree({ projectStore, config, result }: { projectStore: ProjectStore; config: ProjectStore; result: EngineResult }) {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [colorSearch, setColorSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [activeChips, setActiveChips] = useState<Set<FilterChip>>(new Set());

  // ── Expand/collapse key — incrementing remounts the tree so defaultOpen reruns ──
  const [expandKey, setExpandKey] = useState(0);
  const [expandAll, setExpandAll] = useState(false);

  function triggerExpand(all: boolean) {
    setExpandAll(all);
    setExpandKey((k) => k + 1);
  }

  function toggleChip(chip: FilterChip) {
    setActiveChips((prev) => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(chip) ? next.delete(chip) : next.add(chip);
      return next;
    });
  }

  // ── Derived sets from filters ─────────────────────────────────────────────
  const colorQ = colorSearch.trim().toLowerCase();
  const roleQ = roleSearch.trim().toLowerCase();

  const visibleColors: Set<string> | null = useMemo(() => {
    if (!colorQ && !activeChips.has("warnings") && !activeChips.has("errors")) return null;
    const names = new Set<string>();
    projectStore.colors.forEach((c) => {
      const matchSearch = !colorQ || c.name.toLowerCase().includes(colorQ);
      const matchWarn = !activeChips.has("warnings") || result.errors.warnings.some((w) => w.color === c.name);
      const matchErr = !activeChips.has("errors") || result.errors.critical.some((e) => String(e).includes(c.name));
      if (matchSearch && matchWarn && matchErr) names.add(c.name);
    });
    return names;
  }, [colorQ, activeChips, projectStore.colors, result.errors]);

  const visibleRoles: Set<string> | null = useMemo(() => {
    if (!roleQ && !activeChips.has("warnings") && !activeChips.has("adjusted")) return null;
    const names = new Set<string>();
    projectStore.roles.forEach((r) => {
      const matchSearch = !roleQ || r.name.toLowerCase().includes(roleQ);
      const matchWarn = !activeChips.has("warnings") || result.errors.warnings.some((w) => w.role === r.name);
      const matchAdjusted =
        !activeChips.has("adjusted") ||
        (() => {
          return Object.values(result.tokens).some((colorMap) =>
            Object.values(colorMap).some((roleMap) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rm = roleMap as any;
              return Object.entries(rm).some(([roleIdxStr]) => {
                const idx = parseInt(roleIdxStr, 10);
                const roleObj = projectStore.roles[idx];
                if (roleObj?.name !== r.name) return false;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return Object.values(rm[roleIdxStr] as any).some((t: unknown) => (t as TokenEntry).isAdjusted);
              });
            }),
          );
        })();
      if (matchSearch && matchWarn && matchAdjusted) names.add(r.name);
    });
    return names;
  }, [roleQ, activeChips, projectStore.roles, result.tokens, result.errors]);

  // ── Counts for toolbar labels ─────────────────────────────────────────────
  const totalWarnings = result.errors.warnings.length;
  const totalNotices = result.errors.notices.length;
  const totalAdjusted = useMemo(
    () =>
      Object.values(result.tokens).reduce(
        (acc, colorMap) =>
          acc + Object.values(colorMap).reduce((a2, roleMap) => a2 + Object.values(roleMap as object).reduce((a3: number, varMap: unknown) => a3 + Object.values(varMap as object).filter((t: unknown) => (t as TokenEntry).isAdjusted).length, 0), 0),
        0,
      ),
    [result.tokens],
  );

  const themeEntries = Object.entries(result.tokens);
  const scaleEntries = Object.entries(result.scales);
  const includeScales = projectStore.includeColorScalesCollection !== false;

  // Filter scale colors
  const visibleScaleColors = visibleColors ? scaleEntries.filter(([name]) => visibleColors.has(name)) : scaleEntries;

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 11 }}>
      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 12,
          padding: "8px 10px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Expand / Collapse */}
        <ToolbarBtn label="Expand all" onClick={() => triggerExpand(true)} title="Open every node" />
        <ToolbarBtn label="Collapse all" onClick={() => triggerExpand(false)} title="Close every node" />

        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

        {/* Search inputs */}
        <input
          value={colorSearch}
          onChange={(e) => setColorSearch(e.target.value)}
          placeholder="Filter color…"
          style={{
            fontSize: 10,
            padding: "3px 7px",
            borderRadius: 4,
            border: colorSearch ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#e4e4e7",
            outline: "none",
            width: 100,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        />
        <input
          value={roleSearch}
          onChange={(e) => setRoleSearch(e.target.value)}
          placeholder="Filter role…"
          style={{
            fontSize: 10,
            padding: "3px 7px",
            borderRadius: 4,
            border: roleSearch ? "1px solid rgba(167,139,250,0.4)" : "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#e4e4e7",
            outline: "none",
            width: 100,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        />

        {(colorSearch || roleSearch) && (
          <ToolbarBtn
            label="✕ Clear"
            onClick={() => {
              setColorSearch("");
              setRoleSearch("");
            }}
          />
        )}

        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

        {/* Status filter chips */}
        <Chip label={`⚠ ${totalWarnings} warning${totalWarnings !== 1 ? "s" : ""}`} active={activeChips.has("warnings")} color="#fbbf24" onClick={() => toggleChip("warnings")} />
        <Chip label={`✕ ${result.errors.critical.length} critical`} active={activeChips.has("errors")} color="#f87171" onClick={() => toggleChip("errors")} />
        <Chip label={`↺ ${totalAdjusted} adjusted`} active={activeChips.has("adjusted")} color="#a78bfa" onClick={() => toggleChip("adjusted")} />
        <Chip label={`ℹ ${totalNotices} notice${totalNotices !== 1 ? "s" : ""}`} active={activeChips.has("warnings")} color="#60a5fa" onClick={() => toggleChip("warnings")} />

        {activeChips.size > 0 && <ToolbarBtn label="✕ Reset filters" onClick={() => setActiveChips(new Set())} />}
      </div>

      {/* Errors banner */}
      <ErrorsBanner errors={result.errors} />

      {/* ── Tree (keyed so expand/collapse remounts defaultOpen) ── */}
      <div key={expandKey}>
        {/* Config */}
        <ConfigTree config={config} expandAll={expandAll} />

        {/* Scales */}
        {includeScales && visibleScaleColors.length > 0 && (
          <TreeRow depth={0} label="Scales" defaultOpen={expandAll} tag={`${visibleScaleColors.length} color${visibleScaleColors.length !== 1 ? "s" : ""}`}>
            {visibleScaleColors.map(([colorName, steps]) => {
              const colorObj = projectStore.colors.find((c) => c.name === colorName);
              const stepEntries = Object.entries(steps);
              return (
                <TreeRow key={colorName} depth={1} label={colorName} hex={colorObj?.value} defaultOpen={expandAll} tag={`${stepEntries.length} step${stepEntries.length !== 1 ? "s" : ""}`}>
                  {stepEntries.map(([stepKey, step]) => (
                    <ScaleStepNode key={stepKey} stepKey={stepKey} step={step} depth={2} />
                  ))}
                </TreeRow>
              );
            })}
          </TreeRow>
        )}

        {/* Tokens */}
        <TreeRow depth={0} label="Tokens" defaultOpen={true} tag={`${themeEntries.length} theme${themeEntries.length !== 1 ? "s" : ""}`} status={totalWarnings > 0 ? "warn" : totalAdjusted > 0 ? "adjusted" : "ok"}>
          {themeEntries.map(([themeName, colorMap]) => {
            const theme = projectStore.themes.find((t) => t.name.toLowerCase() === themeName);

            // apply color filter to this theme's color entries
            const colorEntries = Object.entries(colorMap).filter(([cn]) => !visibleColors || visibleColors.has(cn));
            if (colorEntries.length === 0) return null;

            const themeWarn = result.errors.warnings.some((w) => w.theme === themeName);
            const themeAdjusted = colorEntries.some(([, roleMap]) => Object.values(roleMap as object).some((vm: unknown) => Object.values(vm as object).some((t: unknown) => (t as TokenEntry).isAdjusted)));

            return (
              <TreeRow key={themeName} depth={1} label={themeName} hex={theme?.bg} defaultOpen={expandAll} status={themeWarn ? "warn" : themeAdjusted ? "adjusted" : "ok"} tag={`${colorEntries.length} color${colorEntries.length !== 1 ? "s" : ""}`}>
                {colorEntries.map(([colorName, roleMap]) => (
                  <ThemeColorNode
                    key={colorName}
                    colorName={colorName}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    roleMap={roleMap as any}
                    depth={2}
                    projectStore={projectStore}
                    result={result}
                    themeName={themeName}
                    visibleRoles={visibleRoles}
                  />
                ))}
              </TreeRow>
            );
          })}
        </TreeRow>
      </div>
    </div>
  );
}
