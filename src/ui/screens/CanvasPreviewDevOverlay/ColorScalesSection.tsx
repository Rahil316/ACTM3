import { useEffect, useMemo } from "react";
import { formatContrastLabel } from "../../utils/engine";
import { normalizeHex } from "../../components/preview";
import type { ProjectStore } from "../../types/state";
import { Swatch, SectionTitle } from "./primitives";
import { logSection, logValidation } from "./devLogging";
import type { DetailItem } from "./types";

// ── Section B: Color Scales ───────────────────────────────────────────────────

export function ColorScalesSection({
  projectStore,
  result,
  onSelect,
  selectedRef,
}: {
  projectStore: ProjectStore;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any;
  onSelect: (item: DetailItem) => void;
  selectedRef: string | null;
}) {
  const stepNames: string[] = useMemo(() => {
    if (Array.isArray(projectStore.scaleSteps) && projectStore.scaleSteps.length > 0) {
      return projectStore.scaleSteps.map((s) => s.name);
    }
    const len = projectStore.scaleLength ?? 23;
    return Array.from({ length: len }, (_, i) => String(i + 1));
  }, [projectStore]);

  const scaleCollection = projectStore.scaleCollectionName || "_scale";

  useEffect(() => {
    logSection("Color Scales", { colors: projectStore.colors.length, steps: stepNames.length });
    projectStore.colors.forEach((color) => {
      const missing = stepNames.filter((s) => !result?.scales?.[color.name]?.[s]);
      logValidation(`Scale: ${color.name} (${stepNames.length - missing.length}/${stepNames.length} steps)`, missing.length === 0, missing.length > 0 ? `missing: ${missing.join(", ")}` : undefined);
    });
  }, []);

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle>
        Color Scales — {projectStore.colors.length} colors × {stepNames.length} steps
      </SectionTitle>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {projectStore.colors.map((color) => (
          <div key={color._id}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#a1a1aa", marginBottom: 4 }}>{color.name}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {stepNames.map((step) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const entry = result?.scales?.[color.name]?.[step] as any;
                const hex = entry && typeof entry === "object" ? entry.value : (entry as string) || null;
                const stepId = projectStore.scaleSteps?.find((s) => s.name === step)?._id ?? step;
                const ref = `scale:${color._id}/${stepId}`;
                const isSelected = selectedRef === ref;

                const contrastVsThemes = projectStore.themes.map((t) => ({
                  theme: t.name,
                  ratio: hex ? formatContrastLabel(hex, t.bg) : "—",
                }));

                return (
                  <div
                    key={step}
                    onClick={() =>
                      onSelect({
                        kind: "scale",
                        colorName: color.name,
                        colorId: color._id ?? "",
                        step,
                        hex,
                        pluginDataRef: ref,
                        figmaCollection: scaleCollection,
                        contrastVsThemes,
                        engineEntry: entry,
                      })
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      borderRadius: 3,
                      padding: "1px 3px",
                      background: isSelected ? "rgba(96,165,250,0.12)" : "transparent",
                      border: isSelected ? "1px solid rgba(96,165,250,0.3)" : "1px solid transparent",
                    }}
                  >
                    <Swatch hex={hex ?? "#888"} size={20} selected={isSelected} />
                    <span style={{ fontSize: 9, color: "#71717a", width: 28, textAlign: "right" }}>{step}</span>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "#a1a1aa" }}>{hex ? normalizeHex(hex) : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
