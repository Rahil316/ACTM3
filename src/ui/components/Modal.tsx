import { type ReactNode, useCallback } from 'react';
import clsx from 'clsx';
import { ModalTitle, Subtitle } from './typography';
import { UI_DIMS } from '../store/projectStore';
import { sendToPlugin } from '../types/messages';

// Z-index layers match vanilla stacking order:
//   settings overlay  z-40
//   run-dialog        z-60
//   confirm overlays  z-60
//   quick-start       z-50
//   design-lab        z-50

export type ModalLayer = 'base' | 'dialog' | 'confirm' | 'overlay';

const LAYER: Record<ModalLayer, string> = {
  base: 'z-40',
  dialog: 'z-[60]',
  confirm: 'z-[60]',
  overlay: 'z-50',
};

// Every full-screen overlay (Modal, FullscreenOverlay, CentredOverlay) would
// otherwise cover App's own resize handle, so each one renders its own copy on
// top. Default z-70 clears every ModalLayer; pass zIndex to clear a caller
// with a higher stacking context (e.g. CentredOverlay's configurable zIndex).
export function ResizeHandle({ zIndex }: { zIndex?: number } = {}) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = window.innerWidth;
    const startH = window.innerHeight;

    function onMove(ev: MouseEvent) {
      const w = Math.max(UI_DIMS.minWidth, Math.min(UI_DIMS.maxWidth, startW + ev.clientX - startX));
      const h = Math.max(UI_DIMS.minHeight, Math.min(UI_DIMS.maxHeight, startH + ev.clientY - startY));
      sendToPlugin({ type: 'resize', width: Math.round(w), height: Math.round(h) });
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={clsx('absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-30 hover:opacity-70 transition-opacity', zIndex === undefined && 'z-[70]')}
      style={{ touchAction: 'none', ...(zIndex !== undefined ? { zIndex } : {}) }}
      title="Drag to resize"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-n-tx-muted">
        <path d="M14 10l-4 4h4v-4zm0-6l-10 10h2l8-8V4zM8 14l6-6v2l-4 4H8z" />
      </svg>
    </div>
  );
}

interface ModalProps {
  open: boolean;
  layer?: ModalLayer;
  children: ReactNode;
  className?: string;
}

// Full-screen overlay that covers the entire plugin iframe.
// Use for settings, run-dialog, quick-start, theme-shop, confirm dialogs.
// Children are responsible for their own layout (flex-col, scroll, etc.).
// Always renders its own ResizeHandle so the resize corner stays reachable
// no matter which overlay is currently open.
export function Modal({ open, layer = 'base', children, className }: ModalProps) {
  if (!open) return null;
  return (
    <div className={clsx('absolute inset-0 flex flex-col bg-n-bg-app', LAYER[layer], className)}>
      {children}
      <ResizeHandle />
    </div>
  );
}

// Frosted confirm overlay — semi-transparent backdrop with centered content.
// Used for confirm-import and confirm-clear overlays.
export function ConfirmOverlay({ open, children, className }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className={clsx(
        'absolute inset-0 bg-n-bg-app/95 backdrop-blur-sm z-[60]',
        'flex items-center justify-center p-6 text-center flex-col gap-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

// Standard modal header bar: title left, action buttons right.
interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function ModalHeader({ title, subtitle, actions, className }: ModalHeaderProps) {
  return (
    <div
      className={clsx('shrink-0 flex items-center justify-between px-3 py-2 border-b border-n-br-default', className)}
    >
      <div>
        <ModalTitle>{title}</ModalTitle>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
