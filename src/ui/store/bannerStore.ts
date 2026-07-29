import { create } from 'zustand';

export type BannerType = 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'loading';

export interface BannerAction {
  label: string;
  style?: 'primary' | 'default';
  onClick: () => void;
}

export interface Banner {
  id: string;
  type: BannerType;
  title?: string;
  message: string;
  detail?: string;
  icon?: string;
  actions?: BannerAction[];
  dismissable?: boolean;
  autoClose?: number;
}

export const BANNER_EXIT_MS = 280; // must match CSS transition duration

type BannerOpts = Partial<Omit<Banner, 'id' | 'type' | 'message'>>;

interface BannerStore {
  banners:  Banner[];
  exiting:  Set<string>; // ids currently playing exit animation
  show:    (banner: Omit<Banner, 'id'> & { id?: string }) => string;
  remove:  (id: string) => void;  // triggers exit animation, then deletes
  _delete: (id: string) => void;  // immediate delete, used internally
  clear:   () => void;
  has:     (id: string) => boolean;
  // Pauses/resumes a banner's auto-close countdown — lives here, not in the
  // component, so the timer keeps running (or stays correctly paused) for
  // EVERY banner regardless of whether BannerSlot currently renders it.
  // BannerSlot caps how many banners are visible at once (see Banner.tsx's
  // MAX_VISIBLE_BANNERS); a timer that only existed on the visible component
  // would mean a banner queued behind that cap never auto-closes at all.
  pauseAutoClose:  (id: string) => void;
  resumeAutoClose: (id: string) => void;
  warn:    (message: string, opts?: BannerOpts) => string;
  error:   (message: string, opts?: BannerOpts) => string;
  info:    (message: string, opts?: BannerOpts) => string;
  success: (message: string, opts?: BannerOpts) => string;
}

let _uid = 0;

// Per-banner auto-close bookkeeping, keyed by id — deliberately kept OUTSIDE
// Zustand state since it's pure timer plumbing, not anything a component
// needs to re-render on. remainingMs is decremented on pause and re-armed on
// resume, so a hovered/focused banner's countdown genuinely stops rather than
// just looking paused while still counting down underneath.
const autoCloseTimers = new Map<string, { remainingMs: number; startedAt: number | null; timeoutId: ReturnType<typeof setTimeout> | null }>();

function clearAutoCloseTimer(id: string): void {
  const t = autoCloseTimers.get(id);
  if (t?.timeoutId) clearTimeout(t.timeoutId);
  autoCloseTimers.delete(id);
}

export const useBannerStore = create<BannerStore>((set, get) => ({
  banners: [],
  exiting: new Set(),

  show(cfg) {
    const id = cfg.id ?? `bn-${++_uid}`;
    const existing = get().banners.find((b) => b.id === id);
    if (existing) {
      // cancel any in-flight exit for this id then update in place
      const exiting = new Set(get().exiting);
      exiting.delete(id);
      set((s) => ({
        exiting,
        banners: s.banners.map((b) => (b.id === id ? { ...b, ...cfg, id } : b)),
      }));
      return id;
    }
    const banner: Banner = { dismissable: true, ...cfg, id };
    set((s) => ({ banners: [...s.banners, banner] }));
    if (banner.autoClose && banner.autoClose > 0) {
      const timeoutId = setTimeout(() => get().remove(id), banner.autoClose);
      autoCloseTimers.set(id, { remainingMs: banner.autoClose, startedAt: Date.now(), timeoutId });
    }
    return id;
  },

  remove(id) {
    clearAutoCloseTimer(id);
    // Mark as exiting — component plays slide-out, then calls _delete
    const exiting = new Set(get().exiting);
    exiting.add(id);
    set({ exiting });
    setTimeout(() => get()._delete(id), BANNER_EXIT_MS);
  },

  _delete(id) {
    const exiting = new Set(get().exiting);
    exiting.delete(id);
    set((s) => ({
      exiting,
      banners: s.banners.filter((b) => b.id !== id),
    }));
  },

  clear() {
    for (const id of autoCloseTimers.keys()) clearAutoCloseTimer(id);
    // Immediately wipe everything — no animation (e.g. story cleanup)
    set({ banners: [], exiting: new Set() });
  },

  has(id) {
    return get().banners.some((b) => b.id === id);
  },

  pauseAutoClose(id) {
    const t = autoCloseTimers.get(id);
    if (!t || t.startedAt === null) return; // no autoClose set, or already paused
    if (t.timeoutId) clearTimeout(t.timeoutId);
    t.remainingMs -= Date.now() - t.startedAt;
    t.startedAt = null;
    t.timeoutId = null;
  },

  resumeAutoClose(id) {
    const t = autoCloseTimers.get(id);
    if (!t || t.startedAt !== null) return; // no autoClose set, or already running
    t.startedAt = Date.now();
    t.timeoutId = setTimeout(() => get().remove(id), Math.max(0, t.remainingMs));
  },

  warn:    (msg, opts) => get().show({ ...opts, type: 'warning', message: msg }),
  error:   (msg, opts) => get().show({ ...opts, type: 'error',   message: msg }),
  info:    (msg, opts) => get().show({ ...opts, type: 'info',    message: msg }),
  success: (msg, opts) => get().show({ ...opts, type: 'success', message: msg }),
}));

// Imperative helper — usable outside React (e.g. in useFigmaBridge callbacks).
export const banner = {
  show:    (...args: Parameters<BannerStore['show']>)    => useBannerStore.getState().show(...args),
  remove:  (id: string)                                  => useBannerStore.getState().remove(id),
  clear:   ()                                            => useBannerStore.getState().clear(),
  warn:    (...args: Parameters<BannerStore['warn']>)    => useBannerStore.getState().warn(...args),
  error:   (...args: Parameters<BannerStore['error']>)   => useBannerStore.getState().error(...args),
  info:    (...args: Parameters<BannerStore['info']>)    => useBannerStore.getState().info(...args),
  success: (...args: Parameters<BannerStore['success']>) => useBannerStore.getState().success(...args),
};
