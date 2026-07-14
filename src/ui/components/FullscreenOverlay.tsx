import { type ReactNode } from 'react';
import clsx from 'clsx';
import { ResizeHandle } from './Modal';

interface FullscreenOverlayProps {
  children: ReactNode;
  className?: string;
}

export function FullscreenOverlay({ children, className }: FullscreenOverlayProps) {
  return (
    <div className={clsx('absolute inset-0 z-50 flex flex-col bg-n-bg-app', className)}>
      {children}
      <ResizeHandle />
    </div>
  );
}
