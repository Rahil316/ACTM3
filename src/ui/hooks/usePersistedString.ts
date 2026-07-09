import { useState } from "react";

export function usePersistedString<T extends string>(key: string, def: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      return (localStorage.getItem(key) as T) ?? def;
    } catch {
      return def;
    }
  });

  function set(v: T) {
    setVal(v);
    try {
      localStorage.setItem(key, v);
    } catch {
      /* ignore */
    }
  }

  return [val, set];
}
