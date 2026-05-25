import { useEffect, useState } from 'react';
import { useBannerStore, BANNER_EXIT_MS, type BannerType } from '../store/bannerStore';
import clsx from 'clsx';

// ── Per-type config ───────────────────────────────────────────────────────────

interface TypeConfig {
  container:        string;
  iconCls:          string;
  textCls:          string;
  barCls:           string;
  actionPrimaryCls: string;
  glyph:            string;
}

const TYPE_CONFIG: Record<BannerType, TypeConfig> = {
  info: {
    container:        'bg-accent-subtle border-b border-accent',
    iconCls:          'text-accent',
    textCls:          'text-text-primary',
    barCls:           'bg-accent',
    actionPrimaryCls: 'bg-accent text-text-on-accent border-accent hover:bg-accent-hover',
    glyph:            'ℹ',
  },
  success: {
    container:        'bg-success-subtle border-b border-success',
    iconCls:          'text-success',
    textCls:          'text-text-primary',
    barCls:           'bg-success',
    actionPrimaryCls: 'bg-success text-text-on-accent border-success',
    glyph:            '✓',
  },
  warning: {
    container:        'bg-warning-subtle border-b border-warning',
    iconCls:          'text-warning',
    textCls:          'text-text-primary',
    barCls:           'bg-warning',
    actionPrimaryCls: 'bg-warning text-text-inverse border-warning',
    glyph:            '⚠',
  },
  error: {
    container:        'bg-danger-subtle border-b border-danger',
    iconCls:          'text-danger',
    textCls:          'text-text-primary',
    barCls:           'bg-danger',
    actionPrimaryCls: 'bg-danger text-text-on-accent border-danger hover:bg-danger-hover',
    glyph:            '✕',
  },
  neutral: {
    container:        'bg-bg-card border-b border-border-base',
    iconCls:          'text-text-dim',
    textCls:          'text-text-muted',
    barCls:           'bg-border-strong',
    actionPrimaryCls: 'bg-bg-input text-text-primary border-border-base hover:bg-bg-hover',
    glyph:            '·',
  },
  loading: {
    container:        'bg-bg-card border-b border-border-base',
    iconCls:          'text-accent',
    textCls:          'text-text-primary',
    barCls:           'bg-accent',
    actionPrimaryCls: 'bg-accent text-text-on-accent border-accent hover:bg-accent-hover',
    glyph:            '…',
  },
};

// ── Progress bar ──────────────────────────────────────────────────────────────
// Renders at 100% width, then on the next frame transitions to 0% over
// `durationMs` so the shrink-left animation plays for the full autoClose period.

function ProgressBar({ durationMs, fillCls }: { durationMs: number; fillCls: string }) {
  const [width, setWidth] = useState('100%');

  useEffect(() => {
    // Double-rAF ensures the browser has painted the 100% state first
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setWidth('0%'));
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id1);
  }, []);

  return (
    <div className="h-[2px] w-full bg-bg-active overflow-hidden">
      <div
        className={clsx('h-full origin-left', fillCls)}
        style={{ width, transition: `width ${durationMs}ms linear` }}
      />
    </div>
  );
}

// ── Spinner for loading type ──────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      width="13" height="13" viewBox="0 0 16 16" fill="none"
      className="animate-spin shrink-0"
      style={{ animationDuration: '0.8s' }}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Banner item ───────────────────────────────────────────────────────────────
// Enter: slides down from -100% + fades in.
// Exit:  slides up to -100% + fades out, driven by the `exiting` store flag.
// Height collapse follows naturally because overflow:hidden + maxHeight transition.

function BannerItem({
  id, type, title, message, detail, icon, actions, dismissable, autoClose,
  isExiting,
}: {
  id: string;
  type: BannerType;
  title?: string;
  message: string;
  detail?: string;
  icon?: string;
  actions?: import('../store/bannerStore').BannerAction[];
  dismissable?: boolean;
  autoClose?: number;
  isExiting: boolean;
}) {
  const remove   = useBannerStore((s) => s.remove);
  const cfg      = TYPE_CONFIG[type];
  const [expanded, setExpanded] = useState(false);

  // Mount → entered transition
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const visible = entered && !isExiting;

  return (
    <div
      className="overflow-hidden"
      style={{
        // Slide + fade on both enter and exit
        transform:  visible ? 'translateY(0)'    : 'translateY(-100%)',
        opacity:    visible ? 1                  : 0,
        maxHeight:  visible ? '200px'            : '0px',
        transition: [
          `transform ${isExiting ? BANNER_EXIT_MS : 240}ms cubic-bezier(0.16,1,0.3,1)`,
          `opacity   ${isExiting ? BANNER_EXIT_MS : 200}ms ease`,
          `max-height ${isExiting ? BANNER_EXIT_MS : 240}ms cubic-bezier(0.16,1,0.3,1)`,
        ].join(', '),
      }}
    >
      <div className={clsx('relative overflow-hidden', cfg.container)}>
        <div className="flex items-start gap-2 px-3 py-2">

          {/* Icon / spinner */}
          <span className={clsx('shrink-0 mt-px leading-none text-[13px] flex items-center', cfg.iconCls)}>
            {type === 'loading' ? <Spinner /> : (icon ?? cfg.glyph)}
          </span>

          {/* Body */}
          <div className="flex-1 min-w-0">
            {title && (
              <p className={clsx('text-[11px] font-semibold mb-0.5', cfg.textCls)}>{title}</p>
            )}
            <p className={clsx('text-[11px] leading-relaxed opacity-90', cfg.textCls)}>{message}</p>

            {/* Expandable detail */}
            {detail && (
              <>
                {expanded && (
                  <p className={clsx('text-[11px] leading-relaxed opacity-70 mt-1.5 pt-1.5 border-t border-border-subtle whitespace-pre-line', cfg.textCls)}>
                    {detail}
                  </p>
                )}
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className={clsx('mt-1 text-[10px] bg-transparent border-none p-0 cursor-pointer underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity', cfg.iconCls)}
                >
                  {expanded ? 'Show less ▴' : 'Show more ▾'}
                </button>
              </>
            )}

            {/* Action buttons */}
            {actions && actions.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {actions.map((a, i) => (
                  <button
                    key={i}
                    onClick={a.onClick}
                    className={clsx(
                      'text-[10px] px-2.5 py-1 rounded-[5px] border cursor-pointer transition-colors font-medium',
                      a.style === 'primary'
                        ? cfg.actionPrimaryCls
                        : 'bg-transparent border-border-base text-text-secondary hover:bg-bg-hover',
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          {dismissable !== false && type !== 'loading' && (
            <button
              onClick={() => remove(id)}
              aria-label="Dismiss"
              className={clsx(
                'shrink-0 size-[18px] flex items-center justify-center rounded-[3px]',
                'bg-transparent border-none text-[10px] cursor-pointer',
                'opacity-40 hover:opacity-100 transition-opacity',
                cfg.textCls,
              )}
            >
              ✕
            </button>
          )}
        </div>

        {/* Auto-close progress bar */}
        {autoClose && autoClose > 0 && (
          <ProgressBar durationMs={autoClose} fillCls={cfg.barCls} />
        )}
      </div>
    </div>
  );
}

// ── BannerSlot ────────────────────────────────────────────────────────────────

export function BannerSlot({ className }: { className?: string }) {
  const banners = useBannerStore((s) => s.banners);
  const exiting = useBannerStore((s) => s.exiting);
  if (banners.length === 0) return null;
  return (
    <div className={clsx('shrink-0', className)}>
      {banners.map((b) => (
        <BannerItem key={b.id} {...b} isExiting={exiting.has(b.id)} />
      ))}
    </div>
  );
}
