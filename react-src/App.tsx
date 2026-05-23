import { useCallback } from 'react';
import { useFigmaBridge } from './hooks/useFigmaBridge';
import { useUiPrefs } from './hooks/useUiPrefs';
import { useUiStore } from './store/uiStore';
import { UI_DIMS } from './store/appStore';
import { BannerSlot } from './components/Banner';
import { ToastHub } from './components/Toast';
import { HeaderIconButton } from './components/HeaderIconButton';
import { IconSettings, IconRun, IconCode } from './components/icons';
import { ColorsScreen } from './screens/ColorsScreen';
import { RolesScreen } from './screens/RolesScreen';
import { SettingsOverlay } from './screens/SettingsOverlay';
import { PreviewScreen } from './screens/PreviewScreen';
import { RunDialog } from './screens/RunDialog';
import { ProjectScreen, QuickStart, ThemeShop } from './screens/ProjectScreen';
import { ExportSheet } from './screens/ExportSheet';
import { sendToPlugin } from './types/messages';
import type { SidebarTab } from './types/state';

const TABS: { value: SidebarTab; label: string }[] = [
  { value: 'color-groups', label: 'Colors' },
  { value: 'roles',        label: 'Roles' },
  { value: 'preview',      label: 'Preview' },
  { value: 'project',      label: 'Project' },
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
      const newW = Math.max(UI_DIMS.minWidth,  Math.min(UI_DIMS.maxWidth,  startW + ev.clientX - startX));
      const newH = Math.max(UI_DIMS.minHeight, Math.min(UI_DIMS.maxHeight, startH + ev.clientY - startY));
      sendToPlugin({ type: 'resize', width: Math.round(newW), height: Math.round(newH) });
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 opacity-30 hover:opacity-70 transition-opacity"
      style={{ touchAction: 'none' }}
      title="Drag to resize"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-text-muted">
        <path d="M14 10l-4 4h4v-4zm0-6l-10 10h2l8-8V4zM8 14l6-6v2l-4 4H8z"/>
      </svg>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  useFigmaBridge();
  useUiPrefs();

  const activeTab    = useUiStore((s) => s.activeSidebarTab);
  const setActiveTab = useUiStore((s) => s.setActiveSidebarTab);
  const openOverlay  = useUiStore((s) => s.openOverlay);

  return (
    <div className="relative flex flex-col h-screen bg-bg-app text-text-primary font-sans text-xs overflow-hidden">

      {/* Overlays — mount at root so they layer over everything */}
      <SettingsOverlay />
      <RunDialog />
      <ExportSheet />
      <QuickStart onClose={() => {}} />
      <ThemeShop />

      {/* Header */}
      <header className="shrink-0 px-3 py-2 flex items-center justify-between border-b border-border-base bg-bg-app sticky top-0 z-10">
        <h1 className="text-[15px] font-bold text-text-primary">Token Wand</h1>
        <div className="flex items-center gap-1">
          <HeaderIconButton
            aria-label="Export tokens"
            onClick={() => openOverlay('design-lab')}
            title="Export tokens"
          >
            <IconCode />
          </HeaderIconButton>
          <HeaderIconButton
            aria-label="Apply to Figma"
            onClick={() => openOverlay('run-dialog')}
            title="Apply to Figma"
          >
            <IconRun />
          </HeaderIconButton>
          <HeaderIconButton
            aria-label="Settings"
            onClick={() => openOverlay('settings')}
            title="Settings"
          >
            <IconSettings />
          </HeaderIconButton>
        </div>
      </header>

      {/* Banner slot — below header, above tabs */}
      <BannerSlot />

      {/* Sidebar tabs */}
      <div className="shrink-0 flex gap-1 px-3 py-2 border-b border-border-base overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={[
              'settings-tab shrink-0',
              activeTab === tab.value ? 'active' : '',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Screen content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'color-groups' && <ColorsScreen />}
        {activeTab === 'roles'        && <RolesScreen />}
        {activeTab === 'preview'      && <PreviewScreen />}
        {activeTab === 'project'      && <ProjectScreen />}
      </main>

      {/* Toast hub — always on top */}
      <ToastHub />

      {/* Resize handle — bottom-right corner */}
      <ResizeHandle />
    </div>
  );
}
