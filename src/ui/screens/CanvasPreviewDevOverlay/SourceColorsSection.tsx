import { useEffect } from "react";
import { contrastRatio, formatContrastLabel } from "../../utils/engine";
import { normalizeHex } from "../../components/preview";
import type { ProjectStore } from "../../types/state";
import { Swatch, Badge, SectionTitle } from "./primitives";
import { logSection, logValidation } from "./devLogging";
import type { DetailItem } from "./types";

// ── Section A: Source Colors ──────────────────────────────────────────────────

export function SourceColorsSection({ projectStore, onSelect, selectedRef }: { projectStore: ProjectStore; onSelect: (item: DetailItem) => void; selectedRef: string | null }) {
  const alphaValues: number[] = projectStore.alphaValues?.length ? projectStore.alphaValues : [10, 25, 50, 75, 90];

  const sourceCollection = projectStore.sourceCollectionName || "_constants";

  useEffect(() => {
    logSection("Source Colors", {
      colors: projectStore.colors.map((c) => ({ name: c.name, value: c.value })),
      alphaValues,
      themes: projectStore.themes.map((t) => ({ name: t.name, bg: t.bg })),
    });
    projectStore.colors.forEach((color) => {
      logValidation(`Source: ${color.name}`, !!color.value, color.value);
      projectStore.themes.forEach((theme) => {
        const ratio = contrastRatio(color.value, theme.bg);
        logValidation(`  Contrast ${color.name} vs ${theme.name}`, ratio != null && ratio >= 1, ratio != null ? `${ratio.toFixed(1)}:1` : "null");
      });
    });
  }, []);

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle>Source Colors ({projectStore.colors.length})</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {projectStore.colors.map((color) => {
          const ref = `source:${color._id}`;
          const isSelected = selectedRef === ref;
          return (
            <div
              key={color._id}
              onClick={() =>
                onSelect({
                  kind: "source",
                  colorName: color.name,
                  colorId: color._id ?? "",
                  hex: color.value,
                  pluginDataRef: ref,
                  figmaCollection: sourceCollection,
                  contrastVsThemes: projectStore.themes.map((t) => ({
                    theme: t.name,
                    bg: t.bg,
                    ratio: formatContrastLabel(color.value, t.bg),
                  })),
                  alphaRefs: alphaValues.map((a) => ({
                    opacity: a,
                    pluginDataRef: `source:${color._id}/${a}`,
                  })),
                })
              }
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                cursor: "pointer",
                borderRadius: 6,
                padding: "6px 8px",
                background: isSelected ? "rgba(167,139,250,0.1)" : "transparent",
                border: isSelected ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent",
                transition: "background 0.1s",
              }}
            >
              <Swatch hex={color.value} size={40} selected={isSelected} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#f4f4f5" }}>{color.name}</span>
                <Badge>{normalizeHex(color.value)}</Badge>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {projectStore.themes.map((theme) => (
                    <Badge key={theme.name} color="#94a3b8">
                      {theme.name} {formatContrastLabel(color.value, theme.bg)}
                    </Badge>
                  ))}
                </div>
                {alphaValues.length > 0 && (
                  <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                    {alphaValues.map((a) => (
                      <Swatch key={a} hex={color.value} size={20} label={`${a}%`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
