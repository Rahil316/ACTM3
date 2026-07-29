import { useEffect, useState } from 'react';
import { useBannerStore, BANNER_EXIT_MS, type BannerType } from '../store/bannerStore';
import { IconInfo, IconCheckCircle, IconAlertTriangle, IconAlertCircle } from './icons';
import clsx from 'clsx';

// ── Per-type config ───────────────────────────────────────────────────────────

interface TypeConfig {
  container:        string;
  iconCls:          string;
  textCls:          string;
  barCls:           string;
  actionPrimaryCls: string;
  icon:             React.ReactNode;
  // Screen readers get an explicit severity word since the icon alone
  // (rendered aria-hidden below) carries no meaning to assistive tech.
  srLabel:          string;
}

const TYPE_CONFIG: Record<BannerType, TypeConfig> = {
  info: {
    container:        'bg-b-fi-subtle border-b border-b-br-default',
    iconCls:          'text-b-tx-muted',
    textCls:          'text-n-tx-primary',
    barCls:           'bg-b-fi-btn-default',
    actionPrimaryCls: 'bg-b-fi-btn-default text-b-tx-btn-default border-b-fi-btn-default hover:bg-b-fi-btn-hover',
    icon:             <IconInfo className="w-3.5 h-3.5" />,
    srLabel:          'Information:',
  },
  success: {
    container:        'bg-s-fi-subtle border-b border-s-br-default',
    iconCls:          'text-s-tx-muted',
    textCls:          'text-n-tx-primary',
    barCls:           'bg-s-fi-btn-default',
    actionPrimaryCls: 'bg-s-fi-btn-default text-s-tx-btn-default border-s-fi-btn-default',
    icon:             <IconCheckCircle className="w-3.5 h-3.5" />,
    srLabel:          'Success:',
  },
  warning: {
    container:        'bg-w-fi-subtle border-b border-w-br-default',
    iconCls:          'text-w-tx-muted',
    textCls:          'text-n-tx-primary',
    barCls:           'bg-w-fi-btn-default',
    actionPrimaryCls: 'bg-w-fi-btn-default text-w-tx-btn-default border-w-fi-btn-default',
    icon:             <IconAlertTriangle className="w-3.5 h-3.5" />,
    srLabel:          'Warning:',
  },
  error: {
    container:        'bg-d-fi-subtle border-b border-d-br-default',
    iconCls:          'text-d-tx-muted',
    textCls:          'text-n-tx-primary',
    barCls:           'bg-d-fi-btn-default',
    actionPrimaryCls: 'bg-d-fi-btn-default text-d-tx-btn-default border-d-fi-btn-default hover:bg-d-fi-btn-hover',
    icon:             <IconAlertCircle className="w-3.5 h-3.5" />,
    srLabel:          'Error:',
  },
  neutral: {
    container:        'bg-n-sf-default border-b border-n-br-default',
    iconCls:          'text-n-tx-dim',
    textCls:          'text-n-tx-muted',
    barCls:           'bg-n-br-strong',
    actionPrimaryCls: 'bg-n-sf-input text-n-tx-primary border-n-br-default hover:bg-n-sf-hover',
    icon:             <IconInfo className="w-3.5 h-3.5" />,
    srLabel:          'Note:',
  },
  loading: {
    container:        'bg-n-sf-default border-b border-n-br-default',
    iconCls:          'text-b-tx-muted',
    textCls:          'text-n-tx-primary',
    barCls:           'bg-b-fi-btn-default',
    actionPrimaryCls: 'bg-b-fi-btn-default text-b-tx-btn-default border-b-fi-btn-default hover:bg-b-fi-btn-hover',
    icon:             null,
    srLabel:          'Working:',
  },
};

// Errors/warnings are assertive (interrupt screen reader output — the user
// needs to know now); info/success/neutral/loading are polite (announced
// after the current utterance finishes, non-interrupting). Matches how a
// screen reader user would want to be notified for each severity.
const ARIA_LIVE: Record<BannerType, 'assertive' | 'polite'> = {
  info: 'polite',
  success: 'polite',
  warning: 'assertive',
  error: 'assertive',
  neutral: 'polite',
  loading: 'polite',
};

// Caps how many banners stack at once — a burst of simultaneous show() calls
// (e.g. several background checks failing at once) would otherwise push the
// dialog content down arbitrarily far. Newest banners are the most relevant,
// so older ones past the cap are dropped from view first (BannerSlot below).
const MAX_VISIBLE_BANNERS = 3;

// ── Progress bar ──────────────────────────────────────────────────────────────
// Renders at 100% width, then on the next frame transitions to 0% over
// `durationMs` so the shrink-left animation plays for the full autoClose period.
// Pauses on hover/focus-within so a banner being read doesn't vanish mid-read.

function ProgressBar({ durationMs, fillCls, paused, reducedMotion }: { durationMs: number; fillCls: string; paused: boolean; reducedMotion: boolean }) {
  const [width, setWidth] = useState('100%');

  useEffect(() => {
    if (reducedMotion) return; // no shrink animation to schedule at all
    // Double-rAF ensures the browser has painted the 100% state first
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => setWidth('0%'));
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id1);
  }, [reducedMotion]);

  return (
    <div className="h-[2px] w-full bg-n-sf-active overflow-hidden" aria-hidden="true">
      <div
        className={clsx('h-full origin-left', fillCls)}
        style={{
          width: reducedMotion ? '100%' : width,
          transition: paused || reducedMotion ? 'none' : `width ${durationMs}ms linear`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />
    </div>
  );
}

// ── Spinner for loading type ──────────────────────────────────────────────────

function Spinner({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 16 16" fill="none"
      className={clsx('shrink-0', !reducedMotion && 'animate-spin')}
      style={{ animationDuration: '0.8s' }}
      aria-hidden="true"
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
// All motion is skipped (snap to final state) under prefers-reduced-motion.

function BannerItem({
  id, type, title, message, detail, actions, dismissable, autoClose,
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
  const remove          = useBannerStore((s) => s.remove);
  const pauseAutoClose  = useBannerStore((s) => s.pauseAutoClose);
  const resumeAutoClose = useBannerStore((s) => s.resumeAutoClose);
  const cfg      = TYPE_CONFIG[type];
  const [expanded, setExpanded] = useState(false);
  // Local, visual-only — the REAL auto-close countdown lives in bannerStore
  // (pauseAutoClose/resumeAutoClose below), so it keeps running correctly
  // even for a banner this component isn't currently mounted for (see
  // MAX_VISIBLE_BANNERS in BannerSlot). This just drives the progress bar's
  // CSS animation state for the banner that IS on screen.
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const setPausedBoth = (next: boolean) => {
    setPaused(next);
    if (next) pauseAutoClose(id);
    else resumeAutoClose(id);
  };

  // Mount → entered transition
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const visible = entered && !isExiting;
  const dismiss = () => remove(id);

  return (
    <div
      className="overflow-hidden"
      style={{
        // Slide + fade on both enter and exit — reduced-motion users get an
        // instant appear/disappear instead (0ms transitions, final state
        // applied immediately) rather than the animated version playing anyway.
        transform:  visible ? 'translateY(0)'    : 'translateY(-100%)',
        opacity:    visible ? 1                  : 0,
        maxHeight:  visible ? '200px'            : '0px',
        transition: reducedMotion
          ? 'none'
          : [
              `transform ${isExiting ? BANNER_EXIT_MS : 240}ms cubic-bezier(0.16,1,0.3,1)`,
              `opacity   ${isExiting ? BANNER_EXIT_MS : 200}ms ease`,
              `max-height ${isExiting ? BANNER_EXIT_MS : 240}ms cubic-bezier(0.16,1,0.3,1)`,
            ].join(', '),
      }}
    >
      <div
        className={clsx('relative overflow-hidden', cfg.container)}
        role={ARIA_LIVE[type] === 'assertive' ? 'alert' : 'status'}
        aria-live={ARIA_LIVE[type]}
        // Errors/warnings should never auto-dismiss out from under a screen
        // reader mid-announcement — atomic ensures the whole region is
        // re-read as one unit rather than just the changed text node.
        aria-atomic="true"
        onMouseEnter={() => setPausedBoth(true)}
        onMouseLeave={() => setPausedBoth(false)}
        onFocus={() => setPausedBoth(true)}
        onBlur={(e) => {
          // Only resume once focus has actually left this banner entirely,
          // not when it moves between two focusable children inside it.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPausedBoth(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && dismissable !== false && type !== 'loading') dismiss();
        }}
      >
        <div className="flex items-start gap-2 px-3 py-2">

          {/* Icon / spinner — decorative; severity is conveyed via srLabel text below, not the glyph itself */}
          <span className={clsx('shrink-0 mt-0.5 flex items-center', cfg.iconCls)} aria-hidden="true">
            {type === 'loading' ? <Spinner reducedMotion={reducedMotion} /> : cfg.icon}
          </span>

          {/* Body */}
          <div className="flex-1 min-w-0">
            <span className="sr-only">{cfg.srLabel}</span>
            {title && (
              <p className={clsx('text-[11px] font-semibold mb-0.5', cfg.textCls)}>{title}</p>
            )}
            <p className={clsx('text-[11px] leading-relaxed opacity-90', cfg.textCls)}>{message}</p>

            {/* Expandable detail */}
            {detail && (
              <>
                {expanded && (
                  <p className={clsx('text-[11px] leading-relaxed opacity-70 mt-1.5 pt-1.5 border-t border-n-br-subtle whitespace-pre-line', cfg.textCls)}>
                    {detail}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className={clsx(
                    'mt-1 text-[10px] bg-transparent border-none p-0 cursor-pointer underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current focus-visible:opacity-100 rounded-sm',
                    cfg.iconCls,
                  )}
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
                    type="button"
                    onClick={a.onClick}
                    className={clsx(
                      'text-[10px] px-2.5 py-1 rounded-[5px] border cursor-pointer transition-colors font-medium',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current',
                      a.style === 'primary'
                        ? cfg.actionPrimaryCls
                        : 'bg-transparent border-n-br-default text-n-tx-secondary hover:bg-n-sf-hover',
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
              type="button"
              onClick={dismiss}
              aria-label="Dismiss notification"
              className={clsx(
                'shrink-0 size-[18px] flex items-center justify-center rounded-[3px]',
                'bg-transparent border-none text-[10px] cursor-pointer',
                'opacity-40 hover:opacity-100 transition-opacity',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current focus-visible:opacity-100',
                cfg.textCls,
              )}
            >
              ✕
            </button>
          )}
        </div>

        {/* Auto-close progress bar */}
        {autoClose && autoClose > 0 && (
          <ProgressBar durationMs={autoClose} fillCls={cfg.barCls} paused={paused} reducedMotion={reducedMotion} />
        )}
      </div>
    </div>
  );
}

// ── Reduced-motion preference ─────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// ── BannerSlot ────────────────────────────────────────────────────────────────
// Auto-close pause/resume lives in bannerStore.ts itself (pauseAutoClose/
// resumeAutoClose), not here — so a banner queued behind MAX_VISIBLE_BANNERS
// (not currently mounted as a BannerItem) still auto-closes correctly on
// schedule instead of its timer only existing while it happens to be on screen.

export function BannerSlot({ className }: { className?: string }) {
  const banners = useBannerStore((s) => s.banners);
  const exiting = useBannerStore((s) => s.exiting);
  // Only the most recent MAX_VISIBLE_BANNERS are rendered — see the constant's
  // comment above. Older ones remain in the store (so remove()/autoClose still
  // apply to them) but simply aren't shown until the newer ones clear.
  const visible = banners.slice(-MAX_VISIBLE_BANNERS);
  // Always mounted, even with zero banners — each BannerItem below owns its
  // OWN aria-live region (role="alert"/"status" on its inner div), and a
  // screen reader only picks up changes in a live region it's already been
  // watching. If this wrapper (and therefore every banner's live region)
  // only mounted once the first banner appeared, that very first banner's
  // announcement could be missed entirely — the region wouldn't have existed
  // yet at the moment the reader needs to start observing it.
  return (
    <div className={clsx('shrink-0', className)}>
      {visible.map((b) => (
        <BannerItem key={b.id} {...b} isExiting={exiting.has(b.id)} />
      ))}
    </div>
  );
}
