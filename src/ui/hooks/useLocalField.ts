import { useState, useEffect } from 'react';

/**
 * Keeps a local copy of a string value for display, committing to the store
 * only on blur. Stays in sync if the prop changes from outside (e.g. undo,
 * rename from tree, demo data reload).
 */
export function useLocalField(
  storeValue: string,
  onCommit: (value: string) => void,
): [string, (e: React.ChangeEvent<HTMLInputElement>) => void, (e: React.FocusEvent<HTMLInputElement>) => void] {
  const [local, setLocal] = useState(storeValue);

  // Sync if the external value changes (e.g. drag-rename, undo)
  useEffect(() => {
    setLocal(storeValue);
  }, [storeValue]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocal(e.target.value);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    if (!val) {
      setLocal(storeValue); // restore — empty name not allowed
    } else if (val !== storeValue) {
      onCommit(val);
    }
  }

  return [local, handleChange, handleBlur];
}
