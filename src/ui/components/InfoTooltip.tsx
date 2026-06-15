import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface InfoTooltipProps {
  content: string;
}

export function InfoTooltip({ content }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!visible || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.top + r.height / 2, left: r.right + 8 });
  }, [visible]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full text-n-tx-dim hover:text-n-tx-muted transition-colors outline-none"
        tabIndex={-1}
        aria-label="More information"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="5.75" stroke="currentColor" strokeWidth="1.25" />
          <path d="M6.5 5.5v4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          <circle cx="6.5" cy="3.5" r="0.75" fill="currentColor" />
        </svg>
      </button>

      {visible && createPortal(
        <div
          role="tooltip"
          style={{ top: pos.top, left: pos.left, transform: "translateY(-50%)", maxWidth: 220, zIndex: 9999 }}
          className="fixed pointer-events-none px-2.5 py-2 rounded-[8px] bg-n-sf-raised border border-n-br-default shadow-lg text-[11px] text-n-tx-secondary leading-relaxed"
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}
