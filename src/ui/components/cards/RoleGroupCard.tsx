import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { variableMaker } from "../../lib/colorEngine";
import { Settings, X, ChevronDown } from "lucide-react";
import { Checkbox } from "../Checkbox";
import type { Color, Theme, RoleLocalBg, RoleLocalBgKind, Role, Variation, VariableScope } from "../../types/state";
import { CardToolbar } from "../CardToolbar";
import { useProjectStore, SCALE_ALGORITHM_OPTIONS } from "../../store/projectStore";
import { useLocalField } from "../../hooks/useLocalField";
import { Input } from "../Input";
import { Button } from "../Button";
import { Collapsible } from "../Collapsible";
import { Select } from "../Select";
import { usePersistedToggle } from "../../hooks/usePersistedToggle";
import { SOLVER_MODE_OPTIONS } from "../../store/projectStore";
import { TokenEntry } from "src/shared/clrEngine";

interface RoleGroupCardProps {
  role: Role;
  idx: number;
  dragListeners?: Record<string, unknown>;
  dragAttributes?: Record<string, unknown>;
}

// ── FloatingDropdown ──────────────────────────────────────────────────────────
// Portals a dropdown list anchored to a ref element.
// Flips above the anchor when there isn't enough space below.

const DROPDOWN_MAX_H = 192; // px — max-h-48

function FloatingDropdown({ anchorRef, open, children }: { anchorRef: React.RefObject<HTMLElement | null>; open: boolean; children: React.ReactNode }) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    function position() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openAbove = spaceBelow < DROPDOWN_MAX_H + 8 && spaceAbove > spaceBelow;
      setStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        ...(openAbove ? { bottom: window.innerHeight - rect.top + 4, top: "auto" } : { top: rect.bottom + 4, bottom: "auto" }),
      });
    }
    position();
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
    };
  }, [open, anchorRef]);

  if (!open) return null;
  return createPortal(
    <div className="bg-bg-card border border-border-base rounded-[8px] shadow-xl overflow-y-auto" style={{ ...style, maxHeight: DROPDOWN_MAX_H }}>
      {children}
    </div>,
    document.body,
  );
}

// ── Local background sub-inputs ───────────────────────────────────────────────

// Parse "[color]/RoleName/VarName" back into { role, variation } parts
function parseDynamicRef(value: string): { role: string; variation: string } {
  const withoutColor = value.replace(/^\[color\]\//i, "");
  const parts = withoutColor.split("/");
  return { role: parts[0] ?? "", variation: parts[1] ?? "" };
}

function LocalBgTokenInput({ localBg, onChange }: { localBg: RoleLocalBg | null; onChange: (bg: RoleLocalBg | null) => void }) {
  const projectStore = useProjectStore((s) => s.projectStore);
  const isDynamic = localBg?.kind === "token-dynamic";
  const storeVal = typeof localBg?.value === "string" ? localBg.value : "";
  const [query, setQuery] = useState(storeVal);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query when store value changes (kind switch, dynamic toggle)
  const prevStoreVal = useRef(storeVal);
  if (prevStoreVal.current !== storeVal) {
    prevStoreVal.current = storeVal;
    setQuery(storeVal);
  }

  // ── Dynamic mode: Role + Variation dropdowns ──────────────────────────────
  // Local state so picking a role doesn't reset while variation is still unset.
  // Initialise from the stored value so existing refs show correctly on open.
  const parsed = parseDynamicRef(storeVal);
  const [selRole, setSelRole] = useState(parsed.role);
  const [selVariation, setSelVariation] = useState(parsed.variation);

  // Keep local state in sync if the stored value changes externally
  const prevDynamicRef = useRef(storeVal);
  if (isDynamic && prevDynamicRef.current !== storeVal) {
    prevDynamicRef.current = storeVal;
    const p = parseDynamicRef(storeVal);
    setSelRole(p.role);
    setSelVariation(p.variation);
  }

  function handleRoleChange(role: string) {
    setSelRole(role);
    setSelVariation(""); // reset variation when role changes
    // don't commit yet — wait until variation is also picked
  }

  function handleVariationChange(variation: string) {
    setSelVariation(variation);
    if (selRole && variation) {
      onChange({ kind: "token-dynamic", value: `[color]/${selRole}/${variation}` });
    }
  }

  // ── Static mode: freetext search ─────────────────────────────────────────
  const PLACEHOLDER_COLOR = projectStore.colors[0]?.name ?? "__color__";

  const allTokenNames = useMemo(() => {
    if (isDynamic) return [];
    try {
      const result = variableMaker({
        colors: projectStore.colors.map((c) => ({ name: c.name, shorthand: c.shorthand, value: c.value, _id: c._id })),
        themes: (projectStore.themes ?? []).map((t) => ({ name: t.name, bg: t.bg })),
        roles: (projectStore.roles ?? []).map((r) => ({
          name: r.name,
          shorthand: r.shorthand,
          variations: r.variations,
          mappingMethod: r.mappingMethod,
        })),
        variations: projectStore.variations ?? [],
        scaleLength: projectStore.scaleLength ?? 11,
        pluginMode: projectStore.pluginMode ?? "scale",
        scaleAlgorithm: projectStore.scaleAlgorithm ?? "Natural",
        tokenNameSegments: ["color", "role", "variation"],
      } as unknown as Parameters<typeof variableMaker>[0]);

      const names = new Set<string>();
      for (const themeTokens of Object.values(result.tokens ?? {})) {
        for (const colorTokens of Object.values(themeTokens as object)) {
          for (const roleTokens of Object.values(colorTokens as object)) {
            for (const token of Object.values(roleTokens as object)) {
              const name = (token as TokenEntry).tokenName;
              if (name) names.add(name);
            }
          }
        }
      }
      return Array.from(names).sort();
    } catch {
      return [];
    }
  }, [projectStore, isDynamic, PLACEHOLDER_COLOR]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? allTokenNames.filter((n) => n.toLowerCase().includes(q)) : allTokenNames;
  }, [allTokenNames, query]);

  function select(name: string) {
    setQuery(name);
    onChange({ kind: "token-static", value: name });
    setOpen(false);
  }

  function toggleDynamic() {
    const next = !isDynamic;
    onChange({ kind: next ? "token-dynamic" : "token-static", value: "" });
    setQuery("");
  }

  // Build role options from projectStore (exclude self — can't bg against own output)
  const roleOptions = projectStore.roles.map((r) => r.name);

  // Build variation options for the selected role
  const variationOptions = useMemo(() => {
    const r = projectStore.roles.find((r) => r.name === selRole);
    const vars = r?.variations ?? projectStore.variations ?? [];
    return vars.map((v) => v.name);
  }, [projectStore.roles, projectStore.variations, selRole]);

  return (
    <div className="p-4 space-y-2">
      {/* Per-color toggle */}
      <button onClick={toggleDynamic} className="flex items-center gap-2 cursor-pointer group">
        <Checkbox checked={isDynamic} />
        <span className="text-[11px] text-text-muted group-hover:text-text-primary transition-colors">Per color</span>
      </button>

      {isDynamic ? (
        /* ── Dynamic: Role + Variation selects ── */
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="space-y-1 w-full">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Role</label>
              <select value={selRole} onChange={(e) => handleRoleChange(e.target.value)} className="w-full bg-bg-input border border-border-base rounded-[6px] px-2 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-accent">
                <option value="">— select role —</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 w-full">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Variation</label>
              <select
                value={selVariation}
                onChange={(e) => handleVariationChange(e.target.value)}
                disabled={!selRole}
                className="w-full bg-bg-input border border-border-base rounded-[6px] px-2 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-accent disabled:opacity-40"
              >
                <option value="">— select variation —</option>
                {variationOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            {selRole && selVariation && (
              <p className="text-[10px] font-mono text-accent">
                [color]/{selRole}/{selVariation}
              </p>
            )}
            <p className="text-[10px] text-text-dim">Resolved per color — bg is the selected role/variation of the same color.</p>
          </div>
        </div>
      ) : (
        /* ── Static: freetext token search ── */
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Token ref</label>
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              className="w-full bg-bg-input border border-border-base rounded-[6px] px-2 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-accent"
              placeholder="Search tokens…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            <FloatingDropdown anchorRef={inputRef} open={open && filtered.length > 0}>
              {filtered.map((name) => (
                <button
                  key={name}
                  className={["w-full text-left px-3 py-1.5 text-[11px] font-mono hover:bg-bg-hover transition-colors", name === storeVal ? "text-accent" : "text-text-primary"].join(" ")}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(name);
                  }}
                >
                  {name}
                </button>
              ))}
            </FloatingDropdown>
          </div>
          <p className="text-[10px] text-text-dim">Same token used as bg for all colors.</p>
        </div>
      )}
    </div>
  );
}

function LocalBgColorInput({ localBg, colors, onChange }: { localBg: RoleLocalBg | null; colors: Color[]; onChange: (bg: RoleLocalBg | null) => void }) {
  const val = typeof localBg?.value === "string" ? localBg.value : (colors[0]?.name ?? "");
  return (
    <div className="p-4 space-y-1">
      <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">Color</label>
      <div className="relative">
        <select
          className="w-full appearance-none bg-bg-input border border-border-base rounded-[6px] px-2 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-accent pr-6"
          value={val}
          onChange={(e) => onChange({ kind: "color", value: e.target.value })}
        >
          {colors.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none" />
      </div>
    </div>
  );
}

function LocalBgHexInput({ themeKey, themeName, value, onCommit }: { themeKey: string; themeName: string; value: string; onCommit: (key: string, val: string) => void }) {
  const [local, handleChange, handleBlur] = useLocalField(value, (v) => onCommit(themeKey, v));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-text-muted w-14 shrink-0">{themeName}</span>
      <input className="flex-1 bg-bg-input border border-border-base rounded-[6px] px-2 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-accent font-mono" placeholder="#ffffff" value={local} onChange={handleChange} onBlur={handleBlur} />
    </div>
  );
}

function LocalBgHexInputs({ localBg, themes, onChange }: { localBg: RoleLocalBg | null; themes: Theme[]; onChange: (bg: RoleLocalBg | null) => void }) {
  const hexMap = typeof localBg?.value === "object" && localBg?.value !== null ? (localBg.value as Record<string, string>) : {};
  function commitKey(key: string, val: string) {
    onChange({ kind: "hex", value: { ...hexMap, [key]: val } });
  }
  return (
    <div className="p-4 space-y-2">
      {themes.map((t) => (
        <LocalBgHexInput key={t._id} themeKey={t.name.toLowerCase()} themeName={t.name} value={hexMap[t.name.toLowerCase()] ?? ""} onCommit={commitKey} />
      ))}
    </div>
  );
}

// ── Role Settings Sheet ───────────────────────────────────────────────────────
// Defined at module level so React never remounts it as a "new" component type.

const FILL_SCOPES: VariableScope[] = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"];
const ALL_LEAF_SCOPES: VariableScope[] = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR", "EFFECT_COLOR"];

function RoleSettingsSheet({ roleIdx, onClose }: { roleIdx: number; onClose: () => void }) {
  const colors = useProjectStore((s) => s.projectStore.colors);
  const themes = useProjectStore((s) => s.projectStore.themes ?? []);
  const role = useProjectStore((s) => s.projectStore.roles[roleIdx]);
  const setRoleScope = useProjectStore((s) => s.setRoleScope);
  const setRoleLocalBg = useProjectStore((s) => s.setRoleLocalBg);
  const setRoleScopes = useProjectStore((s) => s.setRoleScopes);

  type Tab = "colors" | "contrast" | "scope";
  const [activeTab, setActiveTab] = useState<Tab>("colors");

  // Draft state — only committed on Apply
  const [draftScopedIds, setDraftScopedIds] = useState<string[] | null>(role?.scopedColorIds ?? null);
  const [draftLocalBg, setDraftLocalBg] = useState<RoleLocalBg | null>(role?.localBg ?? null);
  const [draftScopes, setDraftScopes] = useState<VariableScope[] | null>(role?.scopes ?? null);

  const isAll = draftScopedIds === null;
  const effectiveIds: string[] = isAll ? colors.map((c) => c._id ?? "") : draftScopedIds;
  const bgKind: RoleLocalBgKind | "none" = draftLocalBg?.kind ?? "none";

  // ── Color scope helpers ───────────────────────────────────────────────────
  function toggleAll() {
    setDraftScopedIds(isAll ? [] : null);
  }
  function toggleColor(id: string) {
    const current: string[] = isAll ? colors.map((c) => c._id ?? "") : [...draftScopedIds!];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    setDraftScopedIds(next.length === colors.length ? null : next);
  }

  // ── Local bg helpers ──────────────────────────────────────────────────────
  function setBgKind(kind: RoleLocalBgKind | "none") {
    if (kind === "none") {
      setDraftLocalBg(null);
      return;
    }
    if (kind === "token-static" || kind === "token-dynamic") {
      setDraftLocalBg({ kind: "token-static", value: "" });
      return;
    }
    if (kind === "color") {
      setDraftLocalBg({ kind: "color", value: colors[0]?.name ?? "" });
      return;
    }
    if (kind === "hex") {
      const map: Record<string, string> = {};
      (themes || []).forEach((t) => {
        map[t.name.toLowerCase()] = "#ffffff";
      });
      setDraftLocalBg({ kind: "hex", value: map });
    }
  }

  // ── Variable scope helpers (Figma-style tree) ─────────────────────────────
  // null = ALL_SCOPES (unrestricted). Otherwise explicit list.
  const isAllScopes = draftScopes === null;
  const activeScopes: VariableScope[] = draftScopes ?? ALL_LEAF_SCOPES;

  function toggleAllScopes() {
    setDraftScopes(isAllScopes ? [] : null);
  }
  function isScopeOn(s: VariableScope) {
    return isAllScopes || activeScopes.includes(s);
  }
  function toggleScopeLeaf(s: VariableScope) {
    const next = isScopeOn(s) ? ALL_LEAF_SCOPES.filter((x) => x !== s) : [...new Set([...activeScopes, s])];
    setDraftScopes(next.length === ALL_LEAF_SCOPES.length ? null : next);
  }
  // Fill parent = on if all 3 children are on
  const isFillOn = FILL_SCOPES.every((s) => isScopeOn(s));
  function toggleFillGroup() {
    if (isFillOn) {
      // turn off all fill children
      const next = ALL_LEAF_SCOPES.filter((s) => !FILL_SCOPES.includes(s)).filter((s) => isScopeOn(s));
      setDraftScopes(next.length === ALL_LEAF_SCOPES.length ? null : next.length === 0 ? [] : next);
    } else {
      // turn on all fill children, keep others as-is
      const next = [...new Set([...activeScopes, ...FILL_SCOPES])];
      setDraftScopes(next.length === ALL_LEAF_SCOPES.length ? null : next);
    }
  }

  function applyChanges() {
    setRoleScope(roleIdx, draftScopedIds);
    setRoleLocalBg(roleIdx, draftLocalBg);
    setRoleScopes(roleIdx, draftScopes);
    onClose();
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "colors", label: "Colors" },
    { id: "contrast", label: "Contrast" },
    { id: "scope", label: "Scope" },
  ];

  const kindOptions: { value: RoleLocalBgKind | "none"; label: string }[] = [
    { value: "none", label: "Theme BG" },
    { value: "token-static", label: "Token" },
    { value: "color", label: "Color" },
    { value: "hex", label: "Hex" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0" style={{ background: "var(--bg-scrim)" }} onClick={onClose} />
      <div className="relative z-10 h-[72%] flex flex-col bg-bg-panel rounded-t-[16px] border-t border-border-base">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between shrink-0">
          <span className="text-[12px] font-semibold text-text-primary">Role Settings</span>
          <button className="text-text-dim hover:text-text-primary cursor-pointer" onClick={onClose}>
            <X size={13} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border-subtle shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={["flex-1 py-2.5 text-[11px] font-semibold transition-colors cursor-pointer", activeTab === tab.id ? "text-accent border-b-2 border-accent -mb-px" : "text-text-muted hover:text-text-primary"].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* ── Colors tab ── */}
          {activeTab === "colors" && (
            <div className="flex flex-col">
              <div className="px-4 py-2.5">
                <p className="text-[11px] text-text-dim">Limit which colors generate tokens for this role.</p>
              </div>
              <button onClick={toggleAll} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle">
                <Checkbox checked={isAll} />
                <span className="text-[12px] font-medium text-text-primary">All colors</span>
              </button>
              {colors.map((c) => (
                <button key={c._id ?? ""} onClick={() => toggleColor(c._id ?? "")} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle last:border-0">
                  <Checkbox checked={effectiveIds.includes(c._id ?? "")} />
                  <div className="w-5 h-5 rounded shrink-0 border border-black/10" style={{ background: c.value }} />
                  <span className="text-[12px] text-text-primary">{c.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Contrast tab ── */}
          {activeTab === "contrast" && (
            <div className="flex flex-col">
              <div className="px-4 py-2.5">
                <p className="text-[11px] text-text-dim">Solve contrast against a local background instead of the global theme background.</p>
              </div>
              <div className="px-4 pb-3 flex gap-1.5 flex-wrap border-b border-border-base">
                {kindOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBgKind(opt.value)}
                    className={[
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer",
                      bgKind === opt.value ? "bg-accent text-text-on-accent border-accent" : "bg-bg-input text-text-muted border-border-base hover:border-border-strong",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {(bgKind === "token-static" || bgKind === "token-dynamic") && <LocalBgTokenInput localBg={draftLocalBg} onChange={setDraftLocalBg} />}
              {bgKind === "color" && <LocalBgColorInput localBg={draftLocalBg} colors={colors} onChange={setDraftLocalBg} />}
              {bgKind === "hex" && <LocalBgHexInputs localBg={draftLocalBg} themes={themes} onChange={setDraftLocalBg} />}
            </div>
          )}

          {/* ── Scope tab — Figma-style tree ── */}
          {activeTab === "scope" && (
            <div className="flex flex-col">
              <div className="px-4 py-2.5">
                <p className="text-[11px] text-text-dim">Restrict where this variable can be applied in Figma.</p>
              </div>

              {/* All scopes (top-level) */}
              <button onClick={toggleAllScopes} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle">
                <Checkbox checked={isAllScopes} />
                <span className="text-[12px] font-medium text-text-primary">Show in all supported properties</span>
              </button>

              {/* Fill group */}
              <button onClick={toggleFillGroup} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle">
                <Checkbox checked={isFillOn} />
                <span className="text-[12px] font-medium text-text-primary">Fill</span>
              </button>
              {/* Fill children — indented */}
              {(["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"] as VariableScope[]).map((s) => (
                <button key={s} onClick={() => toggleScopeLeaf(s)} className="flex items-center gap-3 pl-10 pr-4 py-2 w-full hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle">
                  <Checkbox checked={isScopeOn(s)} />
                  <span className="text-[12px] text-text-primary">{s === "FRAME_FILL" ? "Frame" : s === "SHAPE_FILL" ? "Shape" : "Text"}</span>
                </button>
              ))}

              {/* Stroke */}
              <button onClick={() => toggleScopeLeaf("STROKE_COLOR")} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle">
                <Checkbox checked={isScopeOn("STROKE_COLOR")} />
                <span className="text-[12px] font-medium text-text-primary">Stroke</span>
              </button>

              {/* Effects */}
              <button onClick={() => toggleScopeLeaf("EFFECT_COLOR")} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-bg-hover transition-colors cursor-pointer border-b border-border-subtle last:border-0">
                <Checkbox checked={isScopeOn("EFFECT_COLOR")} />
                <span className="text-[12px] font-medium text-text-primary">Effects</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border-subtle shrink-0">
          <button onClick={applyChanges} className="w-full py-2 rounded-[8px] bg-accent hover:bg-accent-hover text-text-on-accent text-[12px] font-semibold transition-colors cursor-pointer">
            Apply changes
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Variation table ───────────────────────────────────────────────────────────
// Extracted to module level so React doesn't treat it as a new component type
// on each render of RoleGroupCard (which would force full remount every keystroke).

interface VariationTableProps {
  variations: Variation[];
  canEdit: boolean;
  mappingMethod: "contrast" | "index";
  idx: number;
  scaleLength: number;
}

const VariationTable = React.memo(function VariationTable({ variations: vars, canEdit: canEditNames, mappingMethod, idx, scaleLength }: VariationTableProps) {
  const setRoleVariation = useProjectStore((s) => s.setRoleVariation);
  const addRoleVariation = useProjectStore((s) => s.addRoleVariation);
  const removeRoleVariation = useProjectStore((s) => s.removeRoleVariation);
  const cols = canEditNames ? "16px 1fr 56px 88px 24px" : "16px 1fr 88px";
  const headers = canEditNames ? ["#", "Name", "Short", "Target", ""] : ["#", "Variation", "Target"];

  return (
    <div>
      <div className="grid px-2 py-1 bg-bg-app border-b border-border-base gap-1.5" style={{ gridTemplateColumns: cols }}>
        {headers.map((h) => (
          <span key={h} className="text-[10px] font-bold text-text-muted">
            {h}
          </span>
        ))}
      </div>

      {vars.map((v, vi) => {
        const isIndex = mappingMethod === "index";
        return (
          <div key={v._id ?? vi} className={["grid px-2 py-1 items-center gap-1.5", vi < vars.length - 1 ? "border-b border-border-subtle" : "", vi % 2 ? "bg-bg-app" : ""].join(" ")} style={{ gridTemplateColumns: cols }}>
            <span className="text-[10px] text-text-muted tabular-nums">{vi + 1}</span>

            {canEditNames ? (
              <Input size="table" value={v.name ?? ""} onChange={(e) => setRoleVariation(idx, vi, "name", e.target.value)} />
            ) : (
              <span className="text-[11px] px-1.5 text-text-muted truncate">
                {v.name}
                {v.shorthand ? ` (${v.shorthand})` : ""}
              </span>
            )}

            {canEditNames && <Input size="table" value={v.shorthand ?? ""} onChange={(e) => setRoleVariation(idx, vi, "shorthand", e.target.value)} />}

            <Input size="table" type="number" value={String(v.target ?? 4.5)} min={isIndex ? "0" : "1"} max={isIndex ? String(scaleLength - 1) : "21"} step="0.1" onChange={(e) => setRoleVariation(idx, vi, "target", e.target.value)} />

            {canEditNames && <Button variant="ghost" size="xs" square label="−" disabled={vars.length <= 1} onClick={() => removeRoleVariation(idx, vi)} className="hover:text-danger hover:bg-danger-subtle" />}
          </div>
        );
      })}

      {canEditNames && (
        <div className="flex px-2 py-1.5 border-t border-border-subtle">
          <Button variant="ghost" size="sm" label="+ Add variation" onClick={() => addRoleVariation(idx)} className="text-accent hover:text-accent hover:bg-accent-subtle" />
        </div>
      )}
    </div>
  );
});

// ── Card ──────────────────────────────────────────────────────────────────────

export const RoleGroupCard = React.memo(function RoleGroupCard({ role, idx, dragListeners, dragAttributes }: RoleGroupCardProps) {
  const [open, toggleOpen] = usePersistedToggle(`role_${role._id}`, false);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);

  // Actions — stable references, never change
  const setRole = useProjectStore((s) => s.setRole);
  const removeRole = useProjectStore((s) => s.removeRole);

  // Scalar selectors — only re-render when the specific value changes
  const scaleLength = useProjectStore((s) => s.projectStore.scaleLength);
  const pluginMode = useProjectStore((s) => s.projectStore.pluginMode);
  const useUniformAlgo = useProjectStore((s) => s.projectStore.useUniformAlgorithm);
  const algoScope = useProjectStore((s) => s.projectStore.algorithmScopeLevel);
  const canEditNames = useProjectStore((s) => s.projectStore.canEditRoleVariants);
  const roleCount = useProjectStore((s) => s.projectStore.roles.length);

  // Role-level fields — subscribed directly to avoid stale-prop re-render issues
  const roleMappingMethod = useProjectStore((s) => s.projectStore.roles[idx]?.mappingMethod ?? "contrast");
  const roleScaleAlgorithm = useProjectStore((s) => s.projectStore.roles[idx]?.scaleAlgorithm);
  const roleSolverMode = useProjectStore((s) => s.projectStore.roles[idx]?.solverMode);
  const scopedIds = useProjectStore((s) => s.projectStore.roles[idx]?.scopedColorIds ?? null);
  const roleLocalBg = useProjectStore((s) => s.projectStore.roles[idx]?.localBg);

  const vars: Variation[] = useProjectStore((s) => s.projectStore.roles[idx]?.variations ?? []);

  const showAlgoRow = pluginMode === "scale" && !useUniformAlgo && algoScope === "role";
  const showSolverRow = pluginMode === "direct" && !useUniformAlgo && algoScope === "role";
  const algoOptions = SCALE_ALGORITHM_OPTIONS.map((a) => ({ value: a, label: a }));
  const solverOptions = SOLVER_MODE_OPTIONS.map(([v, l]) => ({ value: v, label: l }));

  const scopeLabel = scopedIds !== null ? (scopedIds.length === 0 ? "No colors" : `${scopedIds.length} colors`) : null;
  const hasLocalBg = roleLocalBg;
  const localBgLabel = roleLocalBg ? (roleLocalBg.kind === "token-dynamic" ? "BG: dynamic" : roleLocalBg.kind === "token-static" ? "BG: token" : roleLocalBg.kind === "color" ? "BG: color" : "BG: hex") : null;

  const [localName, onNameChange, onNameBlur] = useLocalField(role.name, (v) => setRole(idx, "name", v));
  const [localShort, onShortChange, onShortBlur] = useLocalField(role.shorthand ?? "", (v) => setRole(idx, "shorthand", v));

  return (
    <div className="group/card relative bg-bg-card rounded-[12px] border border-border-base hover:border-border-strong p-3 space-y-2 transition-colors">
      {/* Name row */}
      <div className="grid gap-2 items-end grid-cols-[1fr_148px]">
        <Input id={`role-${role._id}-name`} value={localName} onChange={onNameChange} onBlur={onNameBlur} label="Name" size="xl" />
        <Input id={`role-${role._id}-short`} value={localShort} onChange={onShortChange} onBlur={onShortBlur} label="Short" size="xl" />
      </div>

      {(scopeLabel || localBgLabel) && (
        <div className="flex gap-1.5 flex-wrap">
          {scopeLabel && <span className="text-[10px] font-semibold text-accent bg-accent-subtle border border-accent/30 rounded-full px-2 py-0.5">{scopeLabel}</span>}
          {localBgLabel && <span className="text-[10px] font-semibold text-accent bg-accent-subtle border border-accent/30 rounded-full px-2 py-0.5">{localBgLabel}</span>}
        </div>
      )}

      <Collapsible
        open={open}
        onToggle={toggleOpen}
        header={
          <>
            <span className="text-[12px] font-medium text-text-primary flex-1">Variations ({vars.length})</span>
          </>
        }
      >
        <div className="py-2">
          <VariationTable variations={vars} canEdit={canEditNames} mappingMethod={roleMappingMethod} idx={idx} scaleLength={scaleLength} />
        </div>
      </Collapsible>

      {showAlgoRow && (
        <div className="space-y-1 mt-2 pt-2 border-t border-border-base">
          <Select label="Algorithm" size="lg" options={algoOptions} value={roleScaleAlgorithm ?? "Natural"} onChange={(e) => setRole(idx, "scaleAlgorithm", e.target.value)} />
        </div>
      )}

      {showSolverRow && (
        <div className="space-y-1 mt-2 pt-2 border-t border-border-base">
          <Select label="Solver" size="lg" options={solverOptions} value={roleSolverMode ?? "natural"} onChange={(e) => setRole(idx, "solverMode", e.target.value)} />
        </div>
      )}

      <CardToolbar onDelete={() => removeRole(idx)} deleteDisabled={roleCount <= 1} deleteTitle="Delete role" dragListeners={dragListeners} dragAttributes={dragAttributes}>
        <Button
          variant="icon"
          size="sm"
          className={scopedIds !== null || hasLocalBg ? "text-accent bg-accent-subtle hover:text-accent-hover hover:bg-accent-subtle/80" : undefined}
          onClick={() => setShowSettingsSheet(true)}
          title="Role settings"
          icon={<Settings size={11} strokeWidth={1.75} />}
        />
      </CardToolbar>

      {showSettingsSheet && <RoleSettingsSheet roleIdx={idx} onClose={() => setShowSettingsSheet(false)} />}
    </div>
  );
});
