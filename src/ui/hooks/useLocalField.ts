import { useState, useEffect } from 'react';

/**
 * Keeps a local copy of a string value for display, committing to the store
 * only on blur. Stays in sync if the prop changes from outside (e.g. undo,
 * rename from tree, demo data reload).
 *
 * `onCommit` may optionally return the value the store actually resolved to
 * (Zustand's `set` is synchronous, so this is available immediately). If the
 * store coerced or rejected the write — e.g. a duplicate-name guard reverting
 * to the previous value — the returned string lets the field resync right
 * away instead of showing the user's rejected input until an unrelated prop
 * change happens to trigger the sync effect below.
 */
export function useLocalField(
  storeValue: string,
  onCommit: (value: string) => string | void,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): [string, (e: React.ChangeEvent<HTMLInputElement>) => void, (e: React.FocusEvent<HTMLInputElement>) => void] {
  const [local, setLocal] = useState(storeValue);

  // Sync if the external value changes (e.g. drag-rename, undo, fallback applied)
  useEffect(() => {
    setLocal(storeValue);
  }, [storeValue]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocal(e.target.value);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    if (!val && !allowEmpty) {
      setLocal(storeValue); // restore — empty not allowed, store handles fallback
    } else if (val !== storeValue) {
      const resolved = onCommit(val);
      if (resolved != null && resolved !== val) setLocal(resolved);
    }
  }

  return [local, handleChange, handleBlur];
}
