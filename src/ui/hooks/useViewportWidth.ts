import { useEffect, useState } from "react";

// Tracks live window width so layout can react to plugin resize (see ResizeHandle in components/Modal.tsx).
export function useViewportWidth() {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}
