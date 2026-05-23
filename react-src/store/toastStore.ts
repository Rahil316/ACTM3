import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warn' | 'neutral';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  icon?: string;
  timeout: number;
}

interface ToastStore {
  toasts: Toast[];
  show: (message: string, opts?: { type?: ToastType; icon?: string; timeout?: number }) => number;
  dismiss: (id: number) => void;
  success: (message: string, opts?: Omit<Parameters<ToastStore['show']>[1], 'type'>) => number;
  error:   (message: string, opts?: Omit<Parameters<ToastStore['show']>[1], 'type'>) => number;
  info:    (message: string, opts?: Omit<Parameters<ToastStore['show']>[1], 'type'>) => number;
  warn:    (message: string, opts?: Omit<Parameters<ToastStore['show']>[1], 'type'>) => number;
}

const MAX_STACK = 5;
const DEFAULT_TIMEOUT = 2000;
let _uid = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  show(message, opts = {}) {
    const id = ++_uid;
    const toast: Toast = {
      id,
      message,
      type: opts.type ?? 'neutral',
      icon: opts.icon,
      timeout: opts.timeout ?? DEFAULT_TIMEOUT,
    };
    set((s) => ({
      toasts: [...s.toasts.slice(-(MAX_STACK - 1)), toast],
    }));
    if (toast.timeout > 0) {
      setTimeout(() => get().dismiss(id), toast.timeout);
    }
    return id;
  },

  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  success: (msg, opts) => get().show(msg, { ...opts, type: 'success' }),
  error:   (msg, opts) => get().show(msg, { ...opts, type: 'error' }),
  info:    (msg, opts) => get().show(msg, { ...opts, type: 'info' }),
  warn:    (msg, opts) => get().show(msg, { ...opts, type: 'warn' }),
}));

// Imperative helper — call toast.success() anywhere without hooks.
export const toast = {
  show:    (...args: Parameters<ToastStore['show']>)    => useToastStore.getState().show(...args),
  success: (...args: Parameters<ToastStore['success']>) => useToastStore.getState().success(...args),
  error:   (...args: Parameters<ToastStore['error']>)   => useToastStore.getState().error(...args),
  info:    (...args: Parameters<ToastStore['info']>)    => useToastStore.getState().info(...args),
  warn:    (...args: Parameters<ToastStore['warn']>)    => useToastStore.getState().warn(...args),
  dismiss: (id: number)                                 => useToastStore.getState().dismiss(id),
};
