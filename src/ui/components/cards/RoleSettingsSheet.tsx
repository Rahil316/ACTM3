import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { variableMaker } from "../../utils/engine";
import { SCOPE_SHORT } from "./RoleGroupCard";
import { LucideClose as X, LucideChevronDown as ChevronDown } from "../icons";
import { Checkbox } from "../Checkbox";
import type { Color, Theme, RoleLocalBg, RoleLocalBgKind, VariableScope, TokenEntry } from "../../types/state";
import { useProjectStore } from "../../store/projectStore";
import { useLocalField } from "../../hooks/useLocalField";

// ── FloatingDropdown ──────────────────────────────────────────────────────────

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
    <div className="bg-n-sf-raised border border-n-br-default rounded-[8px] shadow-xl overflow-y-auto" style={{ ...style, maxHeight: DROPDOWN_MAX_H }}>
      {children}
    </div>,
    document.body,
  );
}

// ── Local background sub-inputs ───────────────────────────────────────────────

// Parse "[color]/RoleName/VarName" back into { role, variation } parts
function parseDynamicRef(value: string): { role: string; variation: string } {
  const withoutColor = value.replace(/^\[color\]\//i, "");
  const lastSlash = withoutColor.lastIndexOf("/");
  if (lastSlash === -1) return { role: withoutColor, variation: "" };
  return { role: withoutColor.slice(0, lastSlash), variation: withoutColor.slice(lastSlash + 1) };
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
  // TODO: migrate to useEngineStore when store exposes token names as a derived slice
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
  }, [projectStore.colors, projectStore.themes, projectStore.roles, projectStore.variations, projectStore.scaleLength, projectStore.pluginMode, projectStore.scaleAlgorithm, isDynamic]);

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
        <span className="text-[11px] text-n-tx-muted group-hover:text-n-tx-primary transition-colors">Per color</span>
      </button>

      {isDynamic ? (
        /* ── Dynamic: Role + Variation selects ── */
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="space-y-1 w-full">
              <label className="text-[10px] font-semibold text-n-tx-muted uppercase tracking-wide">Role</label>
              <select value={selRole} onChange={(e) => handleRoleChange(e.target.value)} className="w-full bg-n-sf-input border border-n-br-default rounded-[6px] px-2 py-1.5 text-[12px] text-n-tx-primary focus:outline-none focus:border-b-br-strong">
                <option value="">— select role —</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 w-full">
              <label className="text-[10px] font-semibold text-n-tx-muted uppercase tracking-wide">Variation</label>
              <select
                value={selVariation}
                onChange={(e) => handleVariationChange(e.target.value)}
                disabled={!selRole}
                className="w-full bg-n-sf-input border border-n-br-default rounded-[6px] px-2 py-1.5 text-[12px] text-n-tx-primary focus:outline-none focus:border-b-br-strong disabled:opacity-40"
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
              <p className="text-[10px] font-mono text-b-tx-muted">
                [color]/{selRole}/{selVariation}
              </p>
            )}
            <p className="text-[10px] text-n-tx-dim">Resolved per color — bg is the selected role/variation of the same color.</p>
          </div>
        </div>
      ) : (
        /* ── Static: freetext token search ── */
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-n-tx-muted uppercase tracking-wide">Token ref</label>
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              className="w-full bg-n-sf-input border border-n-br-default rounded-[6px] px-2 py-1.5 text-[12px] text-n-tx-primary focus:outline-none focus:border-b-br-strong"
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
                  className={["w-full text-left px-3 py-1.5 text-[11px] font-mono hover:bg-n-sf-hover transition-colors", name === storeVal ? "text-b-tx-muted" : "text-n-tx-primary"].join(" ")}
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
          <p className="text-[10px] text-n-tx-dim">Same token used as bg for all colors.</p>
        </div>
      )}
    </div>
  );
}

function LocalBgColorInput({ localBg, colors, onChange }: { localBg: RoleLocalBg | null; colors: Color[]; onChange: (bg: RoleLocalBg | null) => void }) {
  const val = typeof localBg?.value === "string" ? localBg.value : (colors[0]?.name ?? "");
  return (
    <div className="p-4 space-y-1">
      <label className="text-[10px] font-semibold text-n-tx-muted uppercase tracking-wide">Color</label>
      <div className="relative">
        <select
          className="w-full appearance-none bg-n-sf-input border border-n-br-default rounded-[6px] px-2 py-1.5 text-[12px] text-n-tx-primary focus:outline-none focus:border-b-br-strong pr-6"
          value={val}
          onChange={(e) => onChange({ kind: "color", value: e.target.value })}
        >
          {colors.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-n-tx-dim pointer-events-none" />
      </div>
    </div>
  );
}

function LocalBgHexInput({ themeKey, themeName, value, onCommit }: { themeKey: string; themeName: string; value: string; onCommit: (key: string, val: string) => void }) {
  const [local, handleChange, handleBlur] = useLocalField(value, (v) => onCommit(themeKey, v));
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-n-tx-muted w-14 shrink-0">{themeName}</span>
      <input className="flex-1 bg-n-sf-input border border-n-br-default rounded-[6px] px-2 py-1.5 text-[12px] text-n-tx-primary focus:outline-none focus:border-b-br-strong font-mono" placeholder="#ffffff" value={local} onChange={handleChange} onBlur={handleBlur} />
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

const FILL_SCOPES: VariableScope[] = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL"];
const ALL_LEAF_SCOPES: VariableScope[] = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR", "EFFECT_COLOR"];

export function RoleSettingsSheet({ roleIdx, onClose, initialTab = "colors" }: { roleIdx: number; onClose: () => void; initialTab?: "colors" | "contrast" | "scope" }) {
  const colors = useProjectStore((s) => s.projectStore.colors);
  const themes = useProjectStore((s) => s.projectStore.themes ?? []);
  const role = useProjectStore((s) => s.projectStore.roles[roleIdx]);
  const setRoleScope = useProjectStore((s) => s.setRoleScope);
  const setRoleLocalBg = useProjectStore((s) => s.setRoleLocalBg);
  const setRoleScopes = useProjectStore((s) => s.setRoleScopes);

  type Tab = "colors" | "contrast" | "scope";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Draft state — only committed on Apply
  const [draftScopedIds, setDraftScopedIds] = useState<string[] | null>(role?.scopedColorIds ?? null);
  const [draftLocalBg, setDraftLocalBg] = useState<RoleLocalBg | null>(role?.localBg ?? null);
  const [draftScopes, setDraftScopes] = useState<VariableScope[] | null>(role?.scopes ?? null);

  const isAll = draftScopedIds === null;
  const effectiveIds: string[] = isAll ? colors.map((c) => c._id ?? "") : draftScopedIds;
  const bgKind: RoleLocalBgKind | "none" = draftLocalBg?.kind === "token-dynamic" ? "token-static" : (draftLocalBg?.kind ?? "none");

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
      const next = ALL_LEAF_SCOPES.filter((s) => !FILL_SCOPES.includes(s)).filter((s) => isScopeOn(s));
      setDraftScopes(next.length === ALL_LEAF_SCOPES.length ? null : next.length === 0 ? [] : next);
    } else {
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
      <div className="absolute inset-0" style={{ background: "var(--n-sf-overlay)", opacity: 0.7 }} onClick={onClose} />
      <div className="relative z-10 h-[72%] flex flex-col bg-n-bg-panel rounded-t-[16px] border-t border-n-br-default">
        {/* Header */}
        <div className="px-4 py-3 border-b border-n-br-subtle flex items-center justify-between shrink-0">
          <span className="text-[12px] font-semibold text-n-tx-primary">Role Settings</span>
          <button className="text-n-tx-dim hover:text-n-tx-primary cursor-pointer" onClick={onClose}>
            <X size={13} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-n-br-subtle shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={["flex-1 py-2.5 text-[11px] font-semibold transition-colors cursor-pointer", activeTab === tab.id ? "text-b-tx-muted border-b-2 border-b-br-strong -mb-px" : "text-n-tx-muted hover:text-n-tx-primary"].join(" ")}
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
                <p className="text-[11px] text-n-tx-dim">Limit which colors generate tokens for this role.</p>
              </div>
              <button onClick={toggleAll} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-n-sf-hover transition-colors cursor-pointer border-b border-n-br-subtle">
                <Checkbox checked={isAll} />
                <span className="text-[12px] font-medium text-n-tx-primary">All colors</span>
              </button>
              {colors.map((c) => (
                <button key={c._id ?? ""} onClick={() => toggleColor(c._id ?? "")} className="flex items-center gap-3 px-4 py-2.5 hover:bg-n-sf-hover transition-colors cursor-pointer border-b border-n-br-subtle last:border-0">
                  <Checkbox checked={effectiveIds.includes(c._id ?? "")} />
                  <div className="w-5 h-5 rounded shrink-0 border border-black/10" style={{ background: c.value }} />
                  <span className="text-[12px] text-n-tx-primary">{c.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Contrast tab ── */}
          {activeTab === "contrast" && (
            <div className="flex flex-col">
              <div className="px-4 py-2.5">
                <p className="text-[11px] text-n-tx-dim">Solve contrast against a local background instead of the global theme background.</p>
              </div>
              <div className="px-4 pb-3 flex gap-1.5 flex-wrap border-b border-n-br-default">
                {kindOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBgKind(opt.value)}
                    className={[
                      "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer",
                      bgKind === opt.value ? "bg-b-fi-btn-default text-b-tx-btn-default border-b-fi-btn-default" : "bg-n-sf-input text-n-tx-muted border-n-br-default hover:border-n-br-strong",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {bgKind === "token-static" && <LocalBgTokenInput localBg={draftLocalBg} onChange={setDraftLocalBg} />}
              {bgKind === "color" && <LocalBgColorInput localBg={draftLocalBg} colors={colors} onChange={setDraftLocalBg} />}
              {bgKind === "hex" && <LocalBgHexInputs localBg={draftLocalBg} themes={themes} onChange={setDraftLocalBg} />}
            </div>
          )}

          {/* ── Scope tab — Figma-style tree ── */}
          {activeTab === "scope" && (
            <div className="flex flex-col">
              <div className="px-4 py-2.5">
                <p className="text-[11px] text-n-tx-dim">Restrict where this variable can be applied in Figma.</p>
              </div>

              <button onClick={toggleAllScopes} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-n-sf-hover transition-colors cursor-pointer border-b border-n-br-subtle">
                <Checkbox checked={isAllScopes} />
                <span className="text-[12px] font-medium text-n-tx-primary">Show in all supported properties</span>
              </button>

              <button onClick={toggleFillGroup} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-n-sf-hover transition-colors cursor-pointer border-b border-n-br-subtle">
                <Checkbox checked={isFillOn} />
                <span className="text-[12px] font-medium text-n-tx-primary">Fill</span>
              </button>
              {FILL_SCOPES.map((s) => (
                <button key={s} onClick={() => toggleScopeLeaf(s)} className="flex items-center gap-3 pl-10 pr-4 py-2 w-full hover:bg-n-sf-hover transition-colors cursor-pointer border-b border-n-br-subtle">
                  <Checkbox checked={isScopeOn(s)} />
                  <span className="text-[12px] text-n-tx-primary">{SCOPE_SHORT[s] ?? s}</span>
                </button>
              ))}

              <button onClick={() => toggleScopeLeaf("STROKE_COLOR")} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-n-sf-hover transition-colors cursor-pointer border-b border-n-br-subtle">
                <Checkbox checked={isScopeOn("STROKE_COLOR")} />
                <span className="text-[12px] font-medium text-n-tx-primary">Stroke</span>
              </button>

              <button onClick={() => toggleScopeLeaf("EFFECT_COLOR")} className="flex items-center gap-3 px-4 py-2.5 w-full hover:bg-n-sf-hover transition-colors cursor-pointer border-b border-n-br-subtle last:border-0">
                <Checkbox checked={isScopeOn("EFFECT_COLOR")} />
                <span className="text-[12px] font-medium text-n-tx-primary">Effects</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-n-br-subtle shrink-0">
          <button onClick={applyChanges} className="w-full py-2 rounded-[8px] bg-b-fi-btn-default hover:bg-b-fi-btn-hover text-b-tx-btn-default text-[12px] font-semibold transition-colors cursor-pointer">
            Apply changes
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
