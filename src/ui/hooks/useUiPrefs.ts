import { useEffect, useRef } from 'react';
import { useUiStore } from '../store/uiStore';
import { sendToPlugin } from '../types/messages';
import type { UiTheme } from '../types/state';

// ── Figma theme detection ────────────────────────────────────────────────────

function detectFigmaTheme(): 'dark' | 'light' {
  const html = document.documentElement;
  const body = document.body;
  if (html.classList.contains('figma-dark') || body.classList.contains('figma-dark')) return 'dark';
  if (html.classList.contains('figma-light') || body.classList.contains('figma-light')) return 'light';
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

// ── DOM application ───────────────────────────────────────────────────────────

function applyPrefsToDOM(scale: number, theme: UiTheme): void {
  document.documentElement.style.setProperty('--ui-scale', String(scale));
  document.body.style.zoom = String(scale);
  const resolved: 'dark' | 'light' = theme === 'figma' ? detectFigmaTheme() : theme;
  document.body.setAttribute('data-ui-theme', resolved);
}

// ── Hook ─────────────────────────────────────────────────────────────────────
// Applies uiPrefs to the DOM and persists changes to Figma clientStorage.
// Also sets up a MutationObserver so auto-theme ("figma") tracks Figma's
// own dark/light switching while the plugin is open.

export function useUiPrefs(): void {
  const { uiPrefs } = useUiStore();
  const observerRef = useRef<MutationObserver | null>(null);

  // Apply prefs to DOM whenever they change
  useEffect(() => {
    applyPrefsToDOM(uiPrefs.scale, uiPrefs.theme);
    sendToPlugin({ type: 'save-ui-prefs-meta', prefs: uiPrefs });
  }, [uiPrefs.scale, uiPrefs.theme, uiPrefs.language]);

  // Watch for Figma theme changes when in auto mode
  useEffect(() => {
    if (uiPrefs.theme !== 'figma') {
      observerRef.current?.disconnect();
      observerRef.current = null;
      return;
    }

    const reapply = () => applyPrefsToDOM(uiPrefs.scale, 'figma');

    const observer = new MutationObserver(reapply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
    observerRef.current = observer;

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [uiPrefs.theme, uiPrefs.scale]);
}
