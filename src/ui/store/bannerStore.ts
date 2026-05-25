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

interface BannerStore {
  banners:  Banner[];
  exiting:  Set<string>; // ids currently playing exit animation
  show:    (banner: Omit<Banner, 'id'> & { id?: string }) => string;
  remove:  (id: string) => void;  // triggers exit animation, then deletes
  _delete: (id: string) => void;  // immediate delete, used internally
  clear:   () => void;
  has:     (id: string) => boolean;
  warn:    (message: string, opts?: Partial<Omit<Banner, 'id' | 'type' | 'message'>>) => string;
  error:   (message: string, opts?: Partial<Omit<Banner, 'id' | 'type' | 'message'>>) => string;
  info:    (message: string, opts?: Partial<Omit<Banner, 'id' | 'type' | 'message'>>) => string;
  success: (message: string, opts?: Partial<Omit<Banner, 'id' | 'type' | 'message'>>) => string;
}

let _uid = 0;

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
      setTimeout(() => get().remove(id), banner.autoClose);
    }
    return id;
  },

  remove(id) {
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
    // Immediately wipe everything — no animation (e.g. story cleanup)
    set({ banners: [], exiting: new Set() });
  },

  has(id) {
    return get().banners.some((b) => b.id === id);
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
