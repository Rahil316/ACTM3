import type { EngineResult, ExportConfig, Role, TokenEntry } from "../shared/exportEng/types";
import { _eachSourceColor } from "../shared/exportEng/helpers";

type TokenVariations = Record<string, Record<string, TokenEntry>>;

function csvField(val: unknown): string {
  const s = String(val !== undefined && val !== null ? val : "");
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

export const ExportFormatter = {
  toCSV(result: EngineResult, config: ExportConfig): string {
    const lines: string[] = [];

    const sourceColors = _eachSourceColor(config);
    if (sourceColors.length > 0) {
      lines.push("SOURCE COLORS");
      lines.push("Color,Hex,Alpha %,Alpha Hex");
      for (const entry of sourceColors) {
        lines.push([csvField(entry.cLabel), csvField(entry.hex), "", ""].join(","));
        for (const alpha of entry.alphaVariants) {
          const { r, g, b, a } = alpha.rgba;
          lines.push([csvField(entry.cLabel), csvField(entry.hex), csvField(alpha.opacity), csvField(`rgba(${r}, ${g}, ${b}, ${a})`)].join(","));
        }
      }
      lines.push("");
    }

    const scales = config.includeColorScalesCollection !== false ? (result.scales ?? {}) : {};
    const scaleEntries = Object.values(scales);
    if (scaleEntries.length > 0) {
      const firstStep = Object.values(scaleEntries[0])[0];
      const contrastKeys = firstStep ? Object.keys(firstStep.contrast || {}) : [];
      const scaleHeader = ["Group", "Step", "Hex", ...contrastKeys.flatMap((k) => [k + " Contrast", k + " Rating"])].join(",");
      lines.push("COLOR SCALES");
      lines.push(scaleHeader);
      for (const [colorName, scale] of Object.entries(scales)) {
        for (const [step, entry] of Object.entries(scale)) {
          const contrast = entry.contrast;
          const contrastCols = contrastKeys.flatMap((k) => [csvField(contrast && contrast[k] ? contrast[k].ratio : ""), csvField(contrast && contrast[k] ? contrast[k].rating : "")]);
          lines.push([csvField(colorName), csvField(step), csvField(entry.value), ...contrastCols].join(","));
        }
      }
      lines.push("");
    }
    lines.push("ROLE TOKENS");
    lines.push("Color,Role,Variation,Theme,Hex,Contrast,Rating,Adjusted");
    for (const theme of Object.keys(result.tokens || {})) {
      const themeTokens = result.tokens[theme];
      if (!themeTokens) continue;
      for (const [colorName, roles] of Object.entries(themeTokens)) {
        for (const [roleId, variations] of Object.entries(roles as TokenVariations)) {
          const roleObj: Role = (config.roles && config.roles[roleId]) || { name: roleId, shorthand: "" };
          const roleName = roleObj.name || roleId;
          const variationDefs = roleObj.variations ?? config.variations ?? [];
          for (let i = 0; i < variationDefs.length; i++) {
            const token = variations[String(i)];
            if (!token) continue;
            const contrast = token.contrast;
            const dispName = variationDefs[i].shorthand || variationDefs[i].name;
            lines.push(
              [csvField(colorName), csvField(roleName), csvField(dispName), csvField(theme), csvField(token.value), csvField(contrast ? contrast.ratio : ""), csvField(contrast ? contrast.rating : ""), csvField(token.isAdjusted ? "yes" : "")].join(","),
            );
          }
        }
      }
    }

    return lines.join("\n");
  },

};
