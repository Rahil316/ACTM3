import { useCallback, useRef, useState } from "react";
import clsx from "clsx";
import { useFigmaBridge } from "./hooks/useFigmaBridge";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useUiPrefs } from "./hooks/useUiPrefs";
import { useUiStore } from "./store/uiStore";
import { useAppStore, makeBootstrapState, ensureIds, ensureVariations, UI_DIMS } from "./store/appStore";
import { toast } from "./store/toastStore";
import { BannerSlot } from "./components/Banner";
import { ToastHub } from "./components/Toast";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Button } from "./components/Button";
import { Eye, Play, Download, Settings, RotateCcw, Upload, Bookmark, ShoppingBag } from "lucide-react";
import { ColorsScreen } from "./screens/ColorsScreen";
import { RolesScreen } from "./screens/RolesScreen";
import { SettingsOverlay } from "./screens/SettingsOverlay";
import { PreviewScreen } from "./screens/PreviewScreen";
import { RunDialog } from "./screens/RunDialog";
import { ProjectScreen } from "./screens/ProjectScreen";
import { SaveVersionOverlay } from "./screens/SaveVersionOverlay";
import { QuickStart } from "./screens/QuickStart";
import { ThemesScreen } from "./screens/ThemesScreen";
import { ThemeShopOverlay } from "./screens/ThemeShopOverlay";
import { ExportSheet } from "./screens/ExportSheet";
import { TestLabScreen } from "./screens/testLab";
import { sendToPlugin } from "./types/messages";
import type { AppState, SidebarTab } from "./types/state";

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: { value: SidebarTab; label: string }[] = [
  { value: "color-groups", label: "Colors" },
  { value: "roles", label: "Roles" },
  { value: "project", label: "Project" },
  { value: "test-lab" as SidebarTab, label: "Lab 🧪" },
];

// ── Resize handle ─────────────────────────────────────────────────────────────

function ResizeHandle() {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = window.innerWidth;
    const startH = window.innerHeight;

    function onMove(ev: MouseEvent) {
      const w = Math.max(UI_DIMS.minWidth, Math.min(UI_DIMS.maxWidth, startW + ev.clientX - startX));
      const h = Math.max(UI_DIMS.minHeight, Math.min(UI_DIMS.maxHeight, startH + ev.clientY - startY));
      sendToPlugin({ type: "resize", width: Math.round(w), height: Math.round(h) });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  return (
    <div onMouseDown={handleMouseDown} className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 opacity-30 hover:opacity-70 transition-opacity" style={{ touchAction: "none" }} title="Drag to resize">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-text-muted">
        <path d="M14 10l-4 4h4v-4zm0-6l-10 10h2l8-8V4zM8 14l6-6v2l-4 4H8z" />
      </svg>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  useFigmaBridge();
  useUiPrefs();

  const activeTab = useUiStore((s) => s.activeSidebarTab);
  const setActiveTab = useUiStore((s) => s.setActiveSidebarTab);
  const openOverlay = useUiStore((s) => s.openOverlay);

  const loadState = useAppStore((s) => s.loadState);
  const saveBlocked = useAppStore((s) => s.versionSaveBlockedReason);

  const importRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as AppState;
        if (!Array.isArray(parsed.colors) || !Array.isArray(parsed.roles) || !Array.isArray(parsed.themes)) {
          toast.error("Invalid file: missing colors, roles, or themes");
          return;
        }
        ensureIds(parsed);
        ensureVariations(parsed);
        loadState(parsed);
        toast.success("Configuration imported");
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleReset() {
    loadState(makeBootstrapState());
    openOverlay("quick-start");
  }

  useKeyboardShortcuts(importRef);

  const saveBlockedReason = saveBlocked();

  return (
    <div className="relative flex flex-col h-screen bg-bg-app text-text-primary font-sans text-xs overflow-hidden">
      {/* Hidden file input for import */}
      <input ref={importRef} type="file" accept=".json,.wand" className="hidden" onChange={handleImportFile} />

      {/* Dialogs */}
      <ConfirmDialog
        open={confirmReset}
        title="Reset everything?"
        body="This will clear all colors, roles, themes and versions. You'll be taken to the Quick Start screen."
        confirmLabel="Reset"
        confirmVariant="danger-solid"
        onConfirm={() => {
          setConfirmReset(false);
          handleReset();
        }}
        onCancel={() => setConfirmReset(false)}
      />

      {/* Overlays — rendered outside the scroll area so they cover the full UI */}
      <ThemeShopOverlay />
      <SettingsOverlay />
      <PreviewScreen />
      <RunDialog />
      <ExportSheet />
      <SaveVersionOverlay />
      <QuickStart onClose={() => {}} />

      {/* ── Header ── */}
      <header className="shrink-0 px-3 py-2 flex items-center justify-between border-b border-border-base bg-bg-app sticky top-0 z-10">
        <h1 className="text-[15px] font-bold text-text-primary">Token Wand</h1>

        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="md" leftIcon={<Eye size={13} strokeWidth={2} />} label="Preview" onClick={() => openOverlay("preview")} title="Preview  (Alt+P)" />
          <Button variant="secondary" size="md" leftIcon={<Download size={13} strokeWidth={2} />} label="Export" onClick={() => openOverlay("export-sheet")} title="Export tokens" />
          <Button variant="primary" size="md" leftIcon={<Play size={13} strokeWidth={2} />} label="Run" onClick={() => openOverlay("run-dialog")} title="Apply to Figma  (Alt+Enter)" />
        </div>
      </header>

      {/* Banner slot */}
      <BannerSlot />

      {/* ── Tab bar ── */}
      <div className="shrink-0 flex gap-1 px-3 py-2 border-b border-border-base overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={clsx(
              "shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-full border cursor-pointer whitespace-nowrap transition-all duration-150",
              activeTab === tab.value ? "bg-accent border-accent text-text-on-accent" : "border-border-base bg-transparent text-text-muted hover:bg-bg-hover hover:text-text-primary",
            )}
          >
            {tab.label}
          </button>
        ))}

        <div className="flex items-center gap-0.5 ml-auto">
          <Button variant="ghost" size="sm" square icon={<ShoppingBag size={14} strokeWidth={1.75} />} onClick={() => openOverlay("theme-shop")} title="Theme Shop" aria-label="Theme Shop" />
          <Button variant="ghost" size="sm" square icon={<RotateCcw size={14} strokeWidth={1.75} />} onClick={() => setConfirmReset(true)} title="Reset all (clears everything)" aria-label="Reset all" />
          <Button variant="ghost" size="sm" square icon={<Upload size={14} strokeWidth={1.75} />} onClick={() => importRef.current?.click()} title="Import .wand / JSON  (Alt+I)" aria-label="Import .wand / JSON" />
          <Button variant="ghost" size="sm" square icon={<Bookmark size={14} strokeWidth={1.75} />} onClick={() => !saveBlockedReason && openOverlay("save-version")} title={saveBlockedReason ?? "Save state  (Alt+S)"} aria-label="Save state" disabled={!!saveBlockedReason} />
          <Button variant="ghost" size="sm" square icon={<Settings size={14} strokeWidth={1.75} />} onClick={() => openOverlay("settings")} title="Settings  (Alt+K)" aria-label="Settings" />
        </div>
      </div>

      {/* ── Screen content ── */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === "color-groups" && <ColorsScreen />}
        {activeTab === "roles" && <RolesScreen />}
        {activeTab === "project" && <ProjectScreen />}
        {activeTab === "themes" && <ThemesScreen />}
        {(activeTab as string) === "test-lab" && <TestLabScreen />}
      </main>

      <ToastHub />
      <ResizeHandle />
    </div>
  );
}
