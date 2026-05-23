import { useFigmaBridge } from './hooks/useFigmaBridge';
import { useUiPrefs } from './hooks/useUiPrefs';
import { useAppStore } from './store/appStore';
import { useUiStore } from './store/uiStore';

export default function App() {
  // Boot: wire Figma message bridge and apply UI prefs to DOM
  useFigmaBridge();
  useUiPrefs();

  const appState = useAppStore((s) => s.appState);
  const activeOverlay = useUiStore((s) => s.activeOverlay);

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans text-xs">

      {/* Phase 2 boot debug panel — replaced in Phase 3 */}
      <div className="p-3 space-y-2">
        <p className="font-semibold text-sm">Token Wand — Phase 2 ✓</p>

        <div className="rounded border border-gray-200 p-2 space-y-1">
          <p className="text-gray-500 uppercase tracking-wide text-[10px]">Project</p>
          <p><span className="text-gray-400">name:</span> {appState.name}</p>
          <p><span className="text-gray-400">mode:</span> {appState.pluginMode}</p>
          <p><span className="text-gray-400">overlay:</span> {activeOverlay ?? 'none'}</p>
        </div>

        <div className="rounded border border-gray-200 p-2 space-y-1">
          <p className="text-gray-500 uppercase tracking-wide text-[10px]">Colors ({appState.colors.length})</p>
          {appState.colors.map((c) => (
            <p key={c._id}>
              <span
                className="inline-block w-3 h-3 rounded-sm mr-1 align-middle border border-gray-200"
                style={{ background: c.value }}
              />
              {c.name} <span className="text-gray-400">{c.value}</span>
            </p>
          ))}
        </div>

        <div className="rounded border border-gray-200 p-2 space-y-1">
          <p className="text-gray-500 uppercase tracking-wide text-[10px]">Roles ({appState.roles.length})</p>
          {appState.roles.map((r) => (
            <p key={r._id}>{r.name} <span className="text-gray-400">{r.mappingMethod} · {r.minContrast}:1</span></p>
          ))}
        </div>

        <div className="rounded border border-gray-200 p-2 space-y-1">
          <p className="text-gray-500 uppercase tracking-wide text-[10px]">Themes ({appState.themes.length})</p>
          {appState.themes.map((t) => (
            <p key={t._id}>
              <span
                className="inline-block w-3 h-3 rounded-sm mr-1 align-middle border border-gray-200"
                style={{ background: t.bg }}
              />
              {t.name}
            </p>
          ))}
        </div>

        <p className="text-gray-400 text-[10px]">
          Open browser console and run:<br />
          <code className="bg-gray-100 px-1 rounded">
            window.postMessage(&#123;pluginMessage:&#123;type:'load-config',state:null&#125;&#125;,'*')
          </code>
        </p>
      </div>

    </div>
  );
}
