import type { EngineResult, ProjectStore } from "../../types/state";
import { CardTitle, MicroText } from "../../components/typography";
import { RatingBadge, ScaleStepSlice, normalizeHex, getInkMode, inkColor, copyText } from "../../components/preview";
import type { ViewMode } from "./ThemePanel";

// ── Scale table view ──────────────────────────────────────────────────────────

interface ScaleTableViewProps {
  result: EngineResult;
  projectStore: ProjectStore;
}

function ScaleTableView({ result, projectStore }: ScaleTableViewProps) {
  const COL = "80px 1fr 64px 56px 48px";
  const themes = projectStore.themes;

  if (Object.keys(result.scales).length === 0) {
    return <p className="text-[12px] text-n-tx-muted p-4 text-center">No scale in Direct mode.</p>;
  }

  return (
    <div className="flex flex-col gap-4 p-3 pb-6">
      {projectStore.colors.map((color) => {
        const scale = result.scales[color.name];
        if (!scale) return null;
        const srcHex = normalizeHex(color.value);
        const hdrInk = getInkMode(srcHex);

        return (
          <div key={color._id} className="rounded-[10px] overflow-hidden border border-n-br-default">
            {/* Color header */}
            <div className="grid items-center h-8 sticky top-0 z-10" style={{ background: srcHex, gridTemplateColumns: COL }}>
              {(["Step", "Hex", "Ratio", "WCAG", ""].concat(themes.map((t) => t.name)) as string[]).slice(0, 4 + themes.length).map((h, i) => (
                <div key={i} className="px-2 text-[10px] font-bold tracking-[0.07em] uppercase truncate" style={{ color: inkColor(hdrInk, 0.75), paddingLeft: i === 0 ? 12 : undefined }}>
                  {i === 0 ? color.name : h}
                </div>
              ))}
            </div>

            {Object.entries(scale).map(([stepName, stepData]) => {
              const firstTheme = themes[0];
              const contrast = firstTheme ? stepData.contrast?.[firstTheme.name.toLowerCase()] : null;
              const ratioStr = typeof contrast?.ratio === "number" ? contrast.ratio.toFixed(1) : "—";

              return (
                <div key={stepName} className="grid items-center h-9 border-t border-n-br-subtle cursor-pointer hover:bg-n-sf-hover transition-colors" style={{ gridTemplateColumns: COL }} onClick={() => copyText(stepData.value, `${color.name}/${stepName}`)}>
                  <div className="px-3 flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded-[3px] shrink-0 border border-n-br-subtle" style={{ background: stepData.value }} />
                    <span className="text-[11px] font-semibold text-n-tx-primary">{stepName}</span>
                  </div>
                  <div className="px-2">
                    <span
                      className="text-[10px] font-mono font-semibold"
                      style={{ color: stepData.value }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyText(stepData.value, "hex");
                      }}
                    >
                      {stepData.value.toUpperCase()}
                    </span>
                  </div>
                  <div className="px-2">
                    <span className="text-[12px] font-bold tabular-nums text-n-tx-primary">{ratioStr}</span>
                  </div>
                  <div className="px-2">{contrast?.rating && <RatingBadge rating={contrast.rating} />}</div>
                  <div className="px-2 text-[10px] text-n-tx-dim font-mono truncate">
                    {themes
                      .slice(1)
                      .map((t) => {
                        const c = stepData.contrast?.[t.name.toLowerCase()];
                        return c ? `${t.name}: ${c.ratio?.toFixed(1)}` : "";
                      })
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Color scale section ───────────────────────────────────────────────────────

interface ScaleSectionProps {
  result: EngineResult;
  projectStore: ProjectStore;
  groupByStep?: boolean;
  viewMode?: ViewMode;
}

export function ScaleSection({ result, projectStore, groupByStep = false, viewMode = "grid" }: ScaleSectionProps) {
  const colors = projectStore.colors;
  const themes = projectStore.themes;
  const themeKeys = themes.map((t) => t.name.toLowerCase());

  if (Object.keys(result.scales).length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-[12px] text-n-tx-muted">No scale in Direct mode — colors are solved directly per variation target.</p>
      </div>
    );
  }

  if (groupByStep) {
    const firstScale = result.scales[colors[0]?.name];
    const stepNames = firstScale ? Object.keys(firstScale) : [];

    return (
      <div className="flex flex-col gap-4 p-3 pb-6">
        {stepNames.map((stepName) => (
          <div key={stepName} className="flex flex-col gap-2">
            <div className="px-1">
              <CardTitle>{stepName}</CardTitle>
            </div>

            {viewMode === "table" ? (
              // Table: one row per color at this step
              <div className="rounded-[10px] overflow-hidden border border-n-br-default">
                {colors.map((color) => {
                  const stepData = result.scales[color.name]?.[stepName];
                  if (!stepData) return null;
                  const srcHex = normalizeHex(color.value);
                  const contrast = themeKeys.length > 0 ? stepData.contrast?.[themeKeys[0]] : null;
                  const ratioStr = typeof contrast?.ratio === "number" ? contrast.ratio.toFixed(1) : "—";
                  return (
                    <div
                      key={color._id}
                      className="grid items-center h-9 border-t border-n-br-subtle first:border-0 cursor-pointer hover:bg-n-sf-hover transition-colors"
                      style={{ gridTemplateColumns: "1fr 64px 56px 48px" }}
                      onClick={() => copyText(stepData.value, `${color.name}/${stepName}`)}
                    >
                      <div className="px-3 flex items-center gap-2 min-w-0">
                        <div className="w-3.5 h-3.5 rounded-[3px] shrink-0" style={{ background: stepData.value, boxShadow: "0 0 0 1px rgba(0,0,0,0.10)" }} />
                        <div className="w-2.5 h-2.5 rounded-[2px] shrink-0" style={{ background: srcHex, boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }} />
                        <span className="text-[11px] font-semibold text-n-tx-primary truncate">{color.name}</span>
                      </div>
                      <div className="px-2">
                        <span className="text-[10px] font-mono font-semibold" style={{ color: stepData.value }}>
                          {stepData.value.toUpperCase()}
                        </span>
                      </div>
                      <div className="px-2">
                        <span className="text-[12px] font-bold tabular-nums text-n-tx-primary">{ratioStr}</span>
                      </div>
                      <div className="px-2">{contrast?.rating && <RatingBadge rating={contrast.rating} />}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Strip: all colors at this step as a horizontal spectrum
              <div className="flex w-full h-24 rounded-[10px] overflow-hidden cursor-crosshair" style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.12)", border: "1px solid rgba(136,136,136,0.10)" }}>
                {colors.map((color) => {
                  const stepData = result.scales[color.name]?.[stepName];
                  if (!stepData) return null;
                  return <ScaleStepSlice key={color._id} stepName={color.name} stepData={stepData} themeKeys={themeKeys} colorName={color.name} />;
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === "table") {
    return <ScaleTableView result={result} projectStore={projectStore} />;
  }

  return (
    <div className="flex flex-col gap-5 p-3 pb-6">
      {colors.map((color) => {
        const scale = result.scales[color.name];
        if (!scale) return null;
        const steps = Object.entries(scale);
        const srcHex = normalizeHex(color.value);

        return (
          <div key={color._id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-1">
              <div className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: srcHex }} />
              <CardTitle>{color.name}</CardTitle>
              <MicroText className="text-n-tx-dim ml-1">{srcHex.toUpperCase()}</MicroText>
            </div>

            <div className="flex w-full h-24 rounded-[10px] overflow-hidden cursor-crosshair" style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.12)", border: "1px solid rgba(136,136,136,0.10)" }}>
              {steps.map(([stepName, stepData]) => (
                <ScaleStepSlice key={stepName} stepName={stepName} stepData={stepData} themeKeys={themeKeys} colorName={color.name} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
