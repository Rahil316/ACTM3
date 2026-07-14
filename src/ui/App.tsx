import { useEffect, useRef, useState, useDeferredValue } from "react";
import logoSvg from "./assets/logo.svg";
import clsx from "clsx";
import { useFigmaBridge } from "./hooks/useFigmaBridge";
import { useAutoSave } from "./hooks/useAutoSave";
import { useLocalField } from "./hooks/useLocalField";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useUiPrefs } from "./hooks/useUiPrefs";
import { useViewportWidth } from "./hooks/useViewportWidth";
import { useUiStore } from "./store/uiStore";
import { useProjectStore, makeBootstrapState, ensureIds, ensureVariations } from "./store/projectStore";
import { engine } from "./store/engineStore";
import { toast } from "./store/toastStore";
import { BannerSlot } from "./components/Banner";
import { ToastHub } from "./components/Toast";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ResizeHandle } from "./components/Modal";
import { Button } from "./components/Button";
import { LucidePreview as Eye, LucideRun as Play, LucideExport as Download, LucideSettings as Settings, LucideReset as RotateCcw, LucideImport as Upload, LucideBookmark as Bookmark, LucideShop as ShoppingBag } from "./components/icons";
import { ColorsScreen } from "./screens/ColorsScreen";
import { RolesScreen } from "./screens/RolesScreen";
import { SettingsOverlay } from "./screens/SettingsOverlay";
import { PreviewScreen, PreviewSidePanel, SIDE_PANEL_MIN_WIDTH } from "./screens/PreviewScreen";
import { RunDialog } from "./screens/run-dialog";
import { ProjectScreen, VersionsScreen } from "./screens/ProjectScreen";
import { SaveVersionOverlay } from "./screens/SaveVersionOverlay";
import { QuickStart } from "./screens/QuickStart";
import { ThemeShopOverlay } from "./screens/ThemeShopOverlay";
import { CanvasPreviewDevOverlay } from "./screens/CanvasPreviewDevOverlay";

declare const __RELEASE__: boolean;
import { ExportSheet } from "./screens/ExportSheet";
import type { ProjectStore, SidebarTab } from "./types/state";

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: { value: SidebarTab; label: string }[] = [
  { value: "color-groups", label: "Colors" },
  { value: "roles", label: "Roles" },
  { value: "project", label: "Themes" },
  { value: "versions", label: "Versions" },
];

// ── Project name inline editor ────────────────────────────────────────────────

function ProjectNameInput({ projectStore }: { projectStore: ProjectStore }) {
  const updateProjectName = useProjectStore((s) => s.updateProjectName);
  const [localName, onNameChange, onNameBlur] = useLocalField(projectStore.name, updateProjectName);

  return (
    <div className="flex grow items-center gap-2 min-w-0">
      <img src={logoSvg} alt="Token Wand" className="h-[18px] w-auto shrink-0" />
      <input
        type="text"
        value={localName}
        onChange={onNameChange}
        onBlur={onNameBlur}
        aria-label="Project name"
        className="text-[13px] font-semibold text-n-tx-primary bg-transparent border border-transparent outline-none min-w-20 w-full truncate hover:bg-n-sf-hover focus:bg-n-sf-input focus:border-b-br-strong rounded-[4px] px-1 -mx-1 py-0.5 transition-colors cursor-text"
        title="Click to rename project"
      />
    </div>
  );
}

// ── Boot skeleton ─────────────────────────────────────────────────────────────
// Shown while the saved project state is still loading from Figma, so the
// bootstrap defaults never flash on screen before the real data arrives.

function AppSkeleton() {
  return (
    <div className="relative flex flex-col h-full bg-n-bg-app text-n-tx-primary font-sans text-xs overflow-hidden">
      <header className="shrink-0 px-3 py-2 flex gap-2 items-center border-b border-n-br-default bg-n-bg-app">
        <img src={logoSvg} alt="Token Wand" className="h-[18px] w-auto shrink-0 opacity-50" />
        <div className="h-[14px] w-24 rounded bg-n-sf-hover animate-pulse" />
      </header>
      <div className="shrink-0 flex gap-1.5 px-3 py-2 border-b border-n-br-default">
        {[64, 56, 64, 64].map((w, i) => (
          <div key={i} className="h-[26px] rounded-full bg-n-sf-hover animate-pulse" style={{ width: w }} />
        ))}
      </div>
      <div className="flex-1" />
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  useFigmaBridge();
  useAutoSave();
  useUiPrefs();

  const activeTab = useUiStore((s) => s.activeSidebarTab);
  const setActiveTab = useUiStore((s) => s.setActiveSidebarTab);
  const openOverlay = useUiStore((s) => s.openOverlay);
  const activeOverlay = useUiStore((s) => s.activeOverlay);

  // Above SIDE_PANEL_MIN_WIDTH there's enough room to dock the preview next
  // to the editor instead of covering it as a full-screen modal.
  const viewportWidth = useViewportWidth();
  const isPreviewOpen = activeOverlay === "preview";
  const isSidePanelPreview = isPreviewOpen && viewportWidth >= SIDE_PANEL_MIN_WIDTH;

  const loadState = useProjectStore((s) => s.loadState);
  const saveBlockedReason = useProjectStore((s) => s.versionSaveBlockedReason());
  const projectStore = useProjectStore((s) => s.projectStore);
  const isHydrated = useProjectStore((s) => s.isHydrated);

  // Single engine run for the whole app — all screens read from useEngineStore
  const deferredStore = useDeferredValue(projectStore);
  useEffect(() => { engine.compute(deferredStore); }, [deferredStore]);

  const importRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as ProjectStore;
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
  }

  function handleReset() {
    const blank = makeBootstrapState();
    blank.colors = [];
    blank.roles = [];
    blank.themes = [{ _id: blank.themes[0]._id, name: "Light", bg: "#FFFFFF" }];
    loadState(blank);
    openOverlay("quick-start");
  }

  useKeyboardShortcuts(importRef);

  if (!isHydrated) return <AppSkeleton />;

  return (
    <div className="relative flex flex-col h-full bg-n-bg-app text-n-tx-primary font-sans text-xs overflow-hidden">
      {/* Hidden file input for import */}
      <input ref={importRef} type="file" accept=".json,.wand" className="hidden" onChange={handleImportFile} />

      {/* Dialogs */}
      <ConfirmDialog
        open={confirmReset}
        title="Reset everything?"
        body="This will remove all colors, roles, themes and versions. The plugin will start completely empty."
        confirmLabel="Reset"
        confirmVariant="danger-solid"
        onConfirm={() => {
          setConfirmReset(false);
          handleReset();
        }}
        onCancel={() => setConfirmReset(false)}
      />

      {/* Overlays — conditionally mounted so closed overlays don't subscribe to the store */}
      {activeOverlay === "theme-shop" && <ThemeShopOverlay />}
      {activeOverlay === "settings" && <SettingsOverlay />}
      {isPreviewOpen && !isSidePanelPreview && <PreviewScreen />}
      {activeOverlay === "run-dialog" && <RunDialog />}
      {(activeOverlay === "export-sheet" || activeOverlay === "design-lab") && <ExportSheet />}
      {activeOverlay === "save-version" && <SaveVersionOverlay />}
      {activeOverlay === "quick-start" && <QuickStart onClose={() => {}} />}
      {!__RELEASE__ && activeOverlay === "canvas-preview-dev" && <CanvasPreviewDevOverlay />}

      {/* ── Header ── */}
      <header className="shrink-0 px-3 py-2 flex gap-2 items-center border-b border-n-br-default bg-n-bg-app sticky top-0 z-10">
        <ProjectNameInput projectStore={projectStore} />

        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="md" leftIcon={<Eye size={13} strokeWidth={2} />} label="Preview" onClick={() => openOverlay("preview")} title="Preview  (Alt+P)" />
          <Button variant="secondary" size="md" leftIcon={<Download size={13} strokeWidth={2} />} label="Export" onClick={() => openOverlay("export-sheet")} title="Export tokens" />
          <Button variant="primary" size="md" leftIcon={<Play size={13} strokeWidth={2} />} label="Run" onClick={() => openOverlay("run-dialog")} title="Publish to Figma  (Alt+Enter)" />
        </div>
      </header>

      {/* Banner slot */}
      <BannerSlot />

      {/* ── Tab bar + content row (row includes the docked preview panel when open) ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 flex gap-1 px-3 py-2 border-b border-n-br-default overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={clsx(
                "shrink-0 text-[12px] font-medium px-3 py-1.5 rounded-full border cursor-pointer whitespace-nowrap transition-all duration-150",
                activeTab === tab.value ? "bg-b-fi-btn-default border-b-br-default text-b-tx-btn-default" : "border-n-br-default bg-transparent text-n-tx-muted hover:bg-n-sf-hover hover:text-n-tx-primary",
              )}
            >
              {tab.label}
            </button>
          ))}

          <div className="flex items-center gap-0.5 ml-auto">
            <Button variant="ghost" size="sm" square icon={<ShoppingBag size={14} strokeWidth={1.75} />} onClick={() => openOverlay("theme-shop")} title="Theme Shop" aria-label="Theme Shop" />
            <Button variant="ghost" size="sm" square icon={<RotateCcw size={14} strokeWidth={1.75} />} onClick={() => setConfirmReset(true)} title="Reset all (clears everything)" aria-label="Reset all" />
            <Button
              variant="ghost"
              size="sm"
              square
              icon={<Upload size={14} strokeWidth={1.75} />}
              onClick={() => {
                if (importRef.current) {
                  importRef.current.value = "";
                  importRef.current.click();
                }
              }}
              title="Import .wand / JSON  (Alt+I)"
              aria-label="Import .wand / JSON"
            />
            <Button variant="ghost" size="sm" square icon={<Bookmark size={14} strokeWidth={1.75} />} onClick={() => !saveBlockedReason && openOverlay("save-version")} title={saveBlockedReason ?? "Save state  (Alt+S)"} aria-label="Save state" disabled={!!saveBlockedReason} />
            <Button variant="ghost" size="sm" square icon={<Settings size={14} strokeWidth={1.75} />} onClick={() => openOverlay("settings")} title="Settings  (Alt+K)" aria-label="Settings" />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* ── Screen content ── */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {activeTab === "color-groups" && <ColorsScreen />}
            {activeTab === "roles" && <RolesScreen />}
            {activeTab === "project" && <ProjectScreen />}
            {activeTab === "versions" && <VersionsScreen />}
          </main>

          {/* ── Docked preview panel (wide window only — see SIDE_PANEL_MIN_WIDTH) ── */}
          {isSidePanelPreview && (
            <div className="shrink-0 w-[40%] min-w-[360px] max-w-[560px]">
              <PreviewSidePanel />
            </div>
          )}
        </div>
      </div>

      <ToastHub />
      <ResizeHandle />
    </div>
  );
}
