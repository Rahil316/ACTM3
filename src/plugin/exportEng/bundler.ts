import type { EngineResult, ExportConfig, ExportFile } from './types';
import { _slug } from './helpers';
import { fmtCSS } from './fmtCSS';
import { fmtSCSS } from './fmtSCSS';
import { fmtTailwind } from './fmtTailwind';
import { fmtDTCG } from './fmtDTCG';
import { fmtStyleDictionary } from './fmtStyleDictionary';
import { fmtSwift } from './fmtSwift';
import { fmtAndroid } from './fmtAndroid';
import { fmtReactNative } from './fmtReactNative';

export function buildExportBundle(
  result: EngineResult,
  config: ExportConfig,
  formats: string[],
  appState?: Record<string, unknown>,
): ExportFile[] {
  const files: ExportFile[] = [];
  const themeKeys = Object.keys(result.tokens || {});
  const projectSlug = ((appState?.['name'] as string) || config.name || 'tokens')
    .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  for (const fmt of formats) {

    if (fmt === 'css') {
      files.push({ path: `${projectSlug}/css/scale.css`, content: fmtCSS.scale(result, config) });
      for (let ti = 0; ti < themeKeys.length; ti++) {
        files.push({ path: `${projectSlug}/css/${_slug(themeKeys[ti])}.css`, content: fmtCSS.theme(result, config, themeKeys[ti], ti === 0) });
      }
    }

    if (fmt === 'scss') {
      files.push({ path: `${projectSlug}/scss/_scale.scss`, content: fmtSCSS.scale(result, config) });
      files.push({ path: `${projectSlug}/scss/_tokens.scss`, content: fmtSCSS.tokens(result, config) });
      files.push({ path: `${projectSlug}/scss/index.scss`, content: fmtSCSS.index(result, config) });
    }

    if (fmt === 'tailwind') {
      // Tailwind references CSS vars — bundle the scale CSS alongside it
      files.push({ path: `${projectSlug}/tailwind/tailwind.config.js`, content: fmtTailwind.config(result, config) });
      files.push({ path: `${projectSlug}/tailwind/tokens.css`, content: fmtCSS.scale(result, config) });
      for (let ti = 0; ti < themeKeys.length; ti++) {
        files.push({ path: `${projectSlug}/tailwind/${_slug(themeKeys[ti])}.css`, content: fmtCSS.theme(result, config, themeKeys[ti], ti === 0) });
      }
    }

    if (fmt === 'dtcg') {
      files.push({ path: `${projectSlug}/dtcg/scale.json`, content: fmtDTCG.scale(result, config) });
      for (const theme of themeKeys) {
        files.push({ path: `${projectSlug}/dtcg/${_slug(theme)}.json`, content: fmtDTCG.theme(result, config, theme) });
      }
    }

    if (fmt === 'style-dictionary') {
      files.push({ path: `${projectSlug}/style-dictionary/global.json`, content: fmtStyleDictionary.global(result, config) });
      for (const theme of themeKeys) {
        files.push({ path: `${projectSlug}/style-dictionary/${_slug(theme)}.json`, content: fmtStyleDictionary.theme(result, config, theme) });
      }
    }

    if (fmt === 'ios-swift') {
      for (const theme of themeKeys) {
        const name = theme.charAt(0).toUpperCase() + theme.slice(1) + 'Colors.swift';
        files.push({ path: `${projectSlug}/ios/${name}`, content: fmtSwift.file(result, config, theme) });
      }
    }

    if (fmt === 'android') {
      for (let ti = 0; ti < themeKeys.length; ti++) {
        const qualifier = ti === 0 ? 'values' : `values-${_slug(themeKeys[ti])}`;
        files.push({ path: `${projectSlug}/android/res/${qualifier}/colors.xml`, content: fmtAndroid.file(result, config, themeKeys[ti]) });
      }
    }

    if (fmt === 'rn-ts') {
      files.push({ path: `${projectSlug}/rn/tokens/index.ts`, content: fmtReactNative.index(result, config) });
      for (const theme of themeKeys) {
        files.push({ path: `${projectSlug}/rn/tokens/${_slug(theme)}.ts`, content: fmtReactNative.theme(result, config, theme) });
      }
    }

    if (fmt === 'csv') {
      files.push({ path: `${projectSlug}-tokens.csv`, content: '' }); // filled by docGen in index.ts
    }

    if (fmt === 'json') {
      files.push({ path: `${projectSlug}-tokens.json`, content: '' }); // filled by docGen in index.ts
    }

    if (fmt === 'wand') {
      files.push({ path: `${projectSlug}.wand`, content: JSON.stringify(appState || {}, null, 2) });
    }
  }

  return files;
}
