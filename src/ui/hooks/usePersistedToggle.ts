import { useState, useCallback } from 'react';

const PREFIX = 'tw_toggle_';

export function usePersistedToggle(key: string, defaultOpen = true): [boolean, () => void] {
  const storageKey = PREFIX + key;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === null ? defaultOpen : stored === 'true';
    } catch {
      return defaultOpen;
    }
  });

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      try { localStorage.setItem(storageKey, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, [storageKey]);

  return [open, toggle];
}
