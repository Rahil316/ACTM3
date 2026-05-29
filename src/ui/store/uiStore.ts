import { create } from 'zustand';
import type { SidebarTab, ActiveOverlay, SettingsTab, UiPrefs, UiTheme, UiLanguage } from '../types/state';

interface UiStoreState {
  // Sidebar and screen routing
  activeSidebarTab: SidebarTab;
  activeOverlay: ActiveOverlay;
  settingsTab: SettingsTab;

  // UI preferences (persisted in Figma clientStorage)
  uiPrefs: UiPrefs;

  // Drag state (shared so screens can disable inputs during drag)
  colorDragSrcIdx: number | null;
  roleDragSrcIdx: number | null;

  // Figma plan capabilities (set once on plugin startup)
  multiMode: boolean;

  // Selection/Preview state
  isPreviewSelected: boolean;

  // Routing actions
  setActiveSidebarTab: (tab: SidebarTab) => void;
  openOverlay: (overlay: NonNullable<ActiveOverlay>) => void;
  closeOverlay: () => void;
  setSettingsTab: (tab: SettingsTab) => void;

  // UiPrefs actions
  setScale: (scale: number) => void;
  setTheme: (theme: UiTheme) => void;
  setLanguage: (language: UiLanguage) => void;
  applyUiPrefs: (prefs: Partial<UiPrefs>) => void;

  // Drag actions
  setColorDragSrcIdx: (idx: number | null) => void;
  setRoleDragSrcIdx: (idx: number | null) => void;

  // Capabilities actions
  setMultiMode: (multiMode: boolean) => void;

  // Selection/Preview actions
  setIsPreviewSelected: (isSelected: boolean) => void;

  // Tree collapse state (persisted across tab switches)
  colorGroupCollapsed: Record<string, boolean>;
  roleGroupCollapsed: Record<string, boolean>;
  setColorGroupCollapsed: (update: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
  setRoleGroupCollapsed: (update: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}

export const VALID_SCALES = [0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5] as const;
export const VALID_THEMES: UiTheme[] = ['figma', 'dark', 'light'];
export const VALID_LANGUAGES: UiLanguage[] = ['en', 'es', 'hi'];

export const useUiStore = create<UiStoreState>((set) => ({
  activeSidebarTab: 'color-groups',
  activeOverlay: null,
  settingsTab: 'tokens',

  uiPrefs: {
    scale: 1.0,
    theme: 'figma',
    language: 'en',
  },

  colorDragSrcIdx: null,
  roleDragSrcIdx: null,

  multiMode: true,

  isPreviewSelected: false,

  setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),

  openOverlay: (overlay) => set({ activeOverlay: overlay }),

  closeOverlay: () => set({ activeOverlay: null }),

  setSettingsTab: (tab) => set({ settingsTab: tab }),

  setScale: (scale) => {
    const clamped = VALID_SCALES.includes(scale as typeof VALID_SCALES[number])
      ? scale
      : 1.0;
    set((s) => ({ uiPrefs: { ...s.uiPrefs, scale: clamped } }));
  },

  setTheme: (theme) => {
    const safe = VALID_THEMES.includes(theme) ? theme : 'figma';
    set((s) => ({ uiPrefs: { ...s.uiPrefs, theme: safe } }));
  },

  setLanguage: (language) => {
    const safe = VALID_LANGUAGES.includes(language) ? language : 'en';
    set((s) => ({ uiPrefs: { ...s.uiPrefs, language: safe } }));
  },

  applyUiPrefs: (prefs) => {
    set((s) => ({ uiPrefs: { ...s.uiPrefs, ...prefs } }));
  },

  setColorDragSrcIdx: (idx) => set({ colorDragSrcIdx: idx }),
  setRoleDragSrcIdx: (idx) => set({ roleDragSrcIdx: idx }),

  setMultiMode: (multiMode) => set({ multiMode }),

  setIsPreviewSelected: (isPreviewSelected) => set({ isPreviewSelected }),

  colorGroupCollapsed: {},
  roleGroupCollapsed: {},
  setColorGroupCollapsed: (update) => set((s) => ({ colorGroupCollapsed: update(s.colorGroupCollapsed) })),
  setRoleGroupCollapsed: (update) => set((s) => ({ roleGroupCollapsed: update(s.roleGroupCollapsed) })),
}));
