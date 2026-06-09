// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

import { hexToFigmaRgb, isColorDark, bindFill } from "./figmaComponents/helpers";
import { contrastRatio, contrastRating } from "../shared/clrUtils";
import { buildScaleStepMaster } from "./figmaComponents/ScaleStepTile";
import { buildSourceAlphaMaster } from "./figmaComponents/SourceAlphaTile";
import { buildRoleTokenMaster } from "./figmaComponents/RoleTokenTile";
import { translateConfig } from "./config";
import { variableMaker } from "../shared/clrEngine";

function yieldFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS LAYOUT CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

const TREE_INDENT = 16;
const TREE_LINE_WIDTH = 1;
const RT_COLOR_GAP = 12;
const RT_COLOR_LABEL_SIZE = 12;
const RT_COLOR_LABEL_STYLE = "Bold" as const;
const RT_COLOR_LABEL_COLOR = "";
const RT_ROLE_GAP = 4;
const RT_ROLE_LABEL_COLOR = "";

// ─────────────────────────────────────────────────────────────────────────────
// PLUGIN DATA KEYS
// ─────────────────────────────────────────────────────────────────────────────
// All persistent tracking lives in pluginData so it survives renames.
//
//  previewPage        → "1"                  on PageNode
//  previewRole        → "outputFrame"        on the root output frame
//                     → "sourceContainer"    on the Source Colors frame
//                     → "scaleContainer"     on the Color Scales frame
//                     → "roleTokensWrapper"  on the Role Tokens frame
//                     → "master:scale"       on the scale-step component
//                     → "master:source"      on the source-alpha component
//                     → "master:role"        on the role-token component
//  masterFingerprint  → JSON string          on each master — describes the
//                       config it was built for; rebuild only on mismatch
//  sectionFingerprint → JSON string          on each section container —
//                       describes the data it was last rendered with
//  renderInProgress   → "1"                  set before clearFrame, cleared
//                       after write completes; stale = interrupted mid-render

// ─────────────────────────────────────────────────────────────────────────────

function getResultScaleHex(result: AnyObj, colorName: string, stepKey: string): string | null {
  try {
    const entry = result?.scales?.[colorName]?.[stepKey];
    if (entry && typeof entry === "object" && "value" in entry) return entry.value;
    return (entry as string) || null;
  } catch {
    return null;
  }
}

// Stable JSON fingerprint — strips functions, sorts keys so order doesn't matter
function fingerprint(value: AnyObj): string {
  return JSON.stringify(value, Object.keys(value ?? {}).sort());
}

// Find a direct child of a frame by its pluginData previewRole value
function findByRole(parent: FrameNode | PageNode, role: string): FrameNode | ComponentNode | null {
  for (const child of parent.children) {
    if (child.getPluginData("previewRole") === role) return child as FrameNode | ComponentNode;
  }
  return null;
}

// Clear all children of a frame
function clearFrame(f: FrameNode): void {
  for (const child of [...f.children]) {
    try {
      child.remove();
    } catch {
      /* ignore */
    }
  }
}

// ── Interruption guard ────────────────────────────────────────────────────────
// Written to figma.root so it survives plugin close and is readable on next open.
const INTERRUPTED_KEY = "previewInterrupted";

export function markPreviewInterrupted(): void {
  figma.root.setPluginData(INTERRUPTED_KEY, "1");
}

export function clearPreviewInterrupted(): void {
  figma.root.setPluginData(INTERRUPTED_KEY, "");
}

export function wasPreviewInterrupted(): boolean {
  return figma.root.getPluginData(INTERRUPTED_KEY) === "1";
}

export async function generateCanvasPreview(projectStore: AnyObj, result?: AnyObj): Promise<void> {
  const cfg = translateConfig(projectStore);
  if (!result) {
    result = variableMaker(cfg);
  }

  // Mark as in-progress immediately — cleared at the very end.
  // If the plugin is closed before we finish, this flag survives and signals
  // the next run to re-render rather than trust stale fingerprints.
  markPreviewInterrupted();

  // ── 1. Page ───────────────────────────────────────────────────────────────
  let previewPage = figma.root.children.find((p) => p.getPluginData("previewPage") === "1") as PageNode | undefined;

  if (previewPage) {
    await previewPage.loadAsync();
  } else {
    previewPage = figma.createPage();
    previewPage.name = "✦ Token Preview";
    previewPage.setPluginData("previewPage", "1");
  }

  await figma.setCurrentPageAsync(previewPage);

  // ── 2. Fonts ──────────────────────────────────────────────────────────────
  await Promise.all([figma.loadFontAsync({ family: "Inter", style: "Bold" }), figma.loadFontAsync({ family: "Inter", style: "Medium" }), figma.loadFontAsync({ family: "Inter", style: "Regular" })]);

  // ── 3. Variables / collections ────────────────────────────────────────────
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const tokenCol = collections.find((c) => c.name === (projectStore.tokenCollectionName || "color tokens")) || null;
  const scaleCol = collections.find((c) => c.name === (projectStore.scaleCollectionName || "_scale")) || null;
  const allVars = await figma.variables.getLocalVariablesAsync();
  const findVarByRef = (ref: string) => allVars.find((v) => v.getPluginData("tokenRef") === ref);

  const includeScales = projectStore.includeColorScalesCollection !== false;
  const includeSource = projectStore.includeSourceColors === true;
  const themes: AnyObj[] = projectStore.themes || [];

  const alphaValues: number[] = projectStore.alphaValues || [];

  // ── 4. Master components ──────────────────────────────────────────────────
  // Each master stores the config it was built for as a fingerprint.
  // We reuse it if the fingerprint still matches — preserving any user
  // customisations — and only rebuild on a genuine config change.

  const masterScaleFp = fingerprint({ themes: themes.map((t) => ({ name: t.name, bg: t.bg })) });
  const masterSourceFp = fingerprint({ themes: themes.map((t) => ({ name: t.name, bg: t.bg })), alphaValues });
  const masterRoleFp = fingerprint({ version: 1 }); // role master is theme-agnostic

  function getOrBuildMaster(role: "master:scale" | "master:source" | "master:role", fp: string, build: () => ComponentNode, offscreenX: number): ComponentNode {
    const existing = findByRole(previewPage!, role) as ComponentNode | null;
    if (existing && existing.getPluginData("masterFingerprint") === fp) {
      return existing; // reuse — no rebuild, user customisations preserved
    }
    if (existing) {
      try {
        existing.remove();
      } catch {
        /* ignore */
      }
    }
    const master = build();
    master.x = offscreenX;
    master.y = -600;
    master.setPluginData("previewRole", role);
    master.setPluginData("masterFingerprint", fp);
    previewPage!.appendChild(master);
    return master;
  }

  const scaleStepMaster = getOrBuildMaster("master:scale", masterScaleFp, () => buildScaleStepMaster(themes), 0);
  const sourceAlphaMaster = getOrBuildMaster("master:source", masterSourceFp, () => buildSourceAlphaMaster(alphaValues.length, themes), 360);
  // Master uses transparent fill — each instance overrides it with the theme bg
  const roleTokenMaster = getOrBuildMaster("master:role", masterRoleFp, () => buildRoleTokenMaster("ffffff"), 1020);

  // ── 5. Output frame ───────────────────────────────────────────────────────
  // Find by pluginData first (rename-safe), fall back to name for legacy frames.
  let outputFrame = findByRole(previewPage, "outputFrame") as FrameNode | null;
  if (!outputFrame) {
    outputFrame = previewPage.children.find((n) => n.type === "FRAME" && n.name === "Token Preview Output") as FrameNode | null;
    if (outputFrame) outputFrame.setPluginData("previewRole", "outputFrame"); // adopt legacy
  }
  if (!outputFrame) {
    outputFrame = figma.createFrame();
    outputFrame.name = "Token Preview Output";
    outputFrame.setPluginData("previewRole", "outputFrame");
    outputFrame.layoutMode = "HORIZONTAL";
    outputFrame.primaryAxisSizingMode = "AUTO";
    outputFrame.counterAxisSizingMode = "AUTO";
    outputFrame.counterAxisAlignItems = "MIN";
    outputFrame.itemSpacing = 60;
    outputFrame.paddingLeft = 40;
    outputFrame.paddingRight = 40;
    outputFrame.paddingTop = 40;
    outputFrame.paddingBottom = 40;
    outputFrame.fills = [];
    outputFrame.x = 0;
    outputFrame.y = 0;
    previewPage.appendChild(outputFrame);
  }

  // ── 6. Section fingerprints — decide what needs redrawing ─────────────────
  const effectiveStepNames: AnyObj[] = Array.isArray(cfg.scaleSteps) && cfg.scaleSteps.length > 0 ? cfg.scaleSteps : Array.from({ length: cfg.scaleLength ?? 23 }, (_, i) => ({ _id: String(i + 1), name: String(i + 1) }));

  const sourceFp = fingerprint({
    colors: (projectStore.colors || []).map((c: AnyObj) => ({ id: c._id, value: c.value })),
    themes: themes.map((t) => ({ name: t.name, bg: t.bg })),
    alphaValues,
  });

  const scaleFp = fingerprint({
    colors: (projectStore.colors || []).map((c: AnyObj) => ({ id: c._id, value: c.value })),
    steps: effectiveStepNames.map((s: AnyObj) => s._id || s.name),
  });

  const rolesFp = fingerprint({
    tokens: result?.tokens,
    themes: themes.map((t) => ({ name: t.name, bg: t.bg })),
    roles: (projectStore.roles || []).map((r: AnyObj) => r._id),
    vars: (projectStore.variations || []).map((v: AnyObj) => v._id),
  });

  // ── Helper: get-or-create a section container inside outputFrame ──────────
  function getOrCreateSection(role: string, name: string, setup: (f: FrameNode) => void): FrameNode {
    let f = findByRole(outputFrame!, role) as FrameNode | null;
    if (!f) {
      // also search by name for legacy frames without pluginData
      f = outputFrame!.children.find((n) => n.type === "FRAME" && n.name === name) as FrameNode | null;
      if (f) f.setPluginData("previewRole", role);
    }
    if (!f) {
      f = figma.createFrame();
      f.name = name;
      f.setPluginData("previewRole", role);
      setup(f);
      outputFrame!.appendChild(f);
    }
    return f;
  }

  // ── Helper: tree row (1px line + content frame) ────────────────────────────
  function makeTreeRow(lineColor: RGB, contentGap: number): { row: FrameNode; content: FrameNode } {
    const row = figma.createFrame();
    row.layoutMode = "HORIZONTAL";
    row.primaryAxisSizingMode = "AUTO";
    row.counterAxisSizingMode = "AUTO";
    row.itemSpacing = TREE_INDENT - TREE_LINE_WIDTH;
    row.fills = [];
    row.clipsContent = false;

    const line = figma.createRectangle();
    line.name = "│";
    line.resize(TREE_LINE_WIDTH, 8);
    line.layoutAlign = "STRETCH";
    line.fills = [{ type: "SOLID", color: lineColor, opacity: 0.2 }];
    row.appendChild(line);

    const content = figma.createFrame();
    content.layoutMode = "VERTICAL";
    content.primaryAxisSizingMode = "AUTO";
    content.counterAxisSizingMode = "AUTO";
    content.itemSpacing = contentGap;
    content.fills = [];
    row.appendChild(content);

    return { row, content };
  }

  // ── 7. Source Colors ──────────────────────────────────────────────────────
  if (includeSource && (projectStore.colors || []).length > 0) {
    const sourceContainer = getOrCreateSection("sourceContainer", "Source Colors", (f) => {
      f.layoutMode = "VERTICAL";
      f.primaryAxisSizingMode = "AUTO";
      f.counterAxisSizingMode = "AUTO";
      f.itemSpacing = 24;
      f.paddingLeft = 24;
      f.paddingRight = 24;
      f.paddingTop = 24;
      f.paddingBottom = 24;
      f.fills = [];
    });

    const sourceNeedsRender = sourceContainer.getPluginData("sectionFingerprint") !== sourceFp || sourceContainer.getPluginData("renderInProgress") === "1";

    if (sourceNeedsRender) {
      sourceContainer.setPluginData("renderInProgress", "1");
      clearFrame(sourceContainer);

      for (const color of projectStore.colors || []) {
        const colorRow = figma.createFrame();
        colorRow.name = color.name;
        colorRow.layoutMode = "HORIZONTAL";
        colorRow.primaryAxisSizingMode = "AUTO";
        colorRow.counterAxisSizingMode = "AUTO";
        colorRow.itemSpacing = 8;
        colorRow.fills = [];
        sourceContainer.appendChild(colorRow);

        const tileInst = sourceAlphaMaster.createInstance();
        tileInst.name = color.name;
        colorRow.appendChild(tileInst);

        const mainSwatchNode = tileInst.findOne((n) => n.name === "Swatch" && n.parent?.name === "SwatchFrame") as RectangleNode | null;
        if (mainSwatchNode) {
          const srcVar = findVarByRef(`source:${color._id}`);
          if (srcVar) bindFill(mainSwatchNode, srcVar);
          else mainSwatchNode.fills = [{ type: "SOLID", color: hexToFigmaRgb(color.value) }];
        }

        const nameNode = tileInst.findOne((n) => n.name === "Color Name") as TextNode | null;
        if (nameNode) nameNode.characters = color.name;

        for (const theme of themes) {
          const badgeNode = tileInst.findOne((n) => n.name === `Contrast ${theme.name}`) as TextNode | null;
          if (!badgeNode) continue;
          const ratio = contrastRatio(color.value, theme.bg);
          const rating = ratio != null ? contrastRating(color.value, theme.bg) : null;
          badgeNode.characters = ratio != null ? `${theme.name} ${ratio.toFixed(1)}:1 ${rating ?? ""}`.trim() : `${theme.name} —`;
        }

        const alphaStrip = tileInst.findOne((n) => n.name === "AlphaStrip") as FrameNode | null;
        if (alphaStrip) {
          const alphaSwatches = alphaStrip.children.filter((n) => n.name === "Swatch") as RectangleNode[];
          alphaValues.forEach((opacityInt, idx) => {
            const sw = alphaSwatches[idx];
            if (!sw) return;
            const alphaVar = findVarByRef(`source:${color._id}/${opacityInt}`);
            if (alphaVar) bindFill(sw, alphaVar);
            else sw.fills = [{ type: "SOLID", color: hexToFigmaRgb(color.value), opacity: opacityInt / 100 }];
          });
        }
        await yieldFrame();
      }

      sourceContainer.setPluginData("renderInProgress", "");
      sourceContainer.setPluginData("sectionFingerprint", sourceFp);
    }
  } else {
    // Section no longer needed — remove if present
    const old = findByRole(outputFrame, "sourceContainer") as FrameNode | null;
    if (old)
      try {
        old.remove();
      } catch {
        /* ignore */
      }
  }

  // ── 8. Color Scales ───────────────────────────────────────────────────────
  if (includeScales && effectiveStepNames.length > 0) {
    const scaleContainer = getOrCreateSection("scaleContainer", "Color Scales", (f) => {
      f.layoutMode = "HORIZONTAL";
      f.primaryAxisSizingMode = "AUTO";
      f.counterAxisSizingMode = "AUTO";
      f.itemSpacing = 24;
      f.paddingLeft = 24;
      f.paddingRight = 24;
      f.paddingTop = 24;
      f.paddingBottom = 24;
      f.fills = [];
    });

    const scaleNeedsRender = scaleContainer.getPluginData("sectionFingerprint") !== scaleFp || scaleContainer.getPluginData("renderInProgress") === "1";

    if (scaleNeedsRender) {
      scaleContainer.setPluginData("renderInProgress", "1");
      clearFrame(scaleContainer);

      for (const color of projectStore.colors || []) {
        const colorCol = figma.createFrame();
        colorCol.name = color.name;
        colorCol.layoutMode = "VERTICAL";
        colorCol.primaryAxisSizingMode = "AUTO";
        colorCol.counterAxisSizingMode = "AUTO";
        colorCol.itemSpacing = 4;
        colorCol.fills = [];
        scaleContainer.appendChild(colorCol);

        for (const step of effectiveStepNames) {
          const stepName = step.name || step._id;
          const stepFullName = `${color.name}-${stepName}`;
          const tileInst = scaleStepMaster.createInstance();
          tileInst.name = stepFullName;
          colorCol.appendChild(tileInst);

          const swatchNode = tileInst.findOne((n) => n.name === "Swatch") as RectangleNode | null;
          if (swatchNode) {
            const scaleVar = findVarByRef(`scale:${color._id}/${step._id}`);
            if (scaleVar) bindFill(swatchNode, scaleVar);
            else {
              const hex = getResultScaleHex(result, color.name, stepName);
              swatchNode.fills = hex ? [{ type: "SOLID", color: hexToFigmaRgb(hex) }] : [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
            }
          }

          const hexNode = tileInst.findOne((n) => n.name === "Hex Code") as TextNode | null;
          if (hexNode) {
            const hex = getResultScaleHex(result, color.name, stepName);
            hexNode.characters = hex ? `#${hex.replace("#", "").toUpperCase()}` : "—";
          }

          const stepNameNode = tileInst.findOne((n) => n.name === "@ScaleStepName") as TextNode | null;
          if (stepNameNode) stepNameNode.characters = `Step: ${stepName}`;

          const stepFullNameNode = tileInst.findOne((n) => n.name === "@ScaleStepFullName") as TextNode | null;
          if (stepFullNameNode) stepFullNameNode.characters = stepFullName;

          const scaleEntry = (result?.scales?.[color.name] as Record<string, AnyObj> | undefined)?.[stepName];
          for (const theme of themes) {
            const badgeNode = tileInst.findOne((n) => n.name === `Contrast ${theme.name}`) as TextNode | null;
            if (!badgeNode) continue;
            const cr = scaleEntry?.contrast?.[theme.name.toLowerCase()] as AnyObj | undefined;
            badgeNode.characters = cr?.ratio != null ? `${theme.name} ${Number(cr.ratio).toFixed(1)}:1 ${cr.rating ?? ""}`.trim() : `${theme.name} —`;
          }
        }
        await yieldFrame();
      }

      scaleContainer.setPluginData("renderInProgress", "");
      scaleContainer.setPluginData("sectionFingerprint", scaleFp);
    }
  } else {
    const old = findByRole(outputFrame, "scaleContainer") as FrameNode | null;
    if (old)
      try {
        old.remove();
      } catch {
        /* ignore */
      }
  }

  // ── 9. Role Tokens ────────────────────────────────────────────────────────
  const roleTokensWrapper = getOrCreateSection("roleTokensWrapper", "Role Tokens", (f) => {
    f.layoutMode = "HORIZONTAL";
    f.primaryAxisSizingMode = "AUTO";
    f.counterAxisSizingMode = "AUTO";
    f.itemSpacing = 40;
    f.fills = [];
  });

  const rolesNeedsRender = roleTokensWrapper.getPluginData("sectionFingerprint") !== rolesFp || roleTokensWrapper.getPluginData("renderInProgress") === "1";

  if (rolesNeedsRender) {
    roleTokensWrapper.setPluginData("renderInProgress", "1");
    clearFrame(roleTokensWrapper);

    for (const theme of themes) {
      const isBgDark = isColorDark(theme.bg);
      const autoOnBg = isBgDark ? { r: 0.95, g: 0.95, b: 0.95 } : { r: 0.08, g: 0.08, b: 0.08 };
      const autoOnBgMuted = isBgDark ? { r: 0.7, g: 0.7, b: 0.7 } : { r: 0.45, g: 0.45, b: 0.45 };
      const colorLabelColor = RT_COLOR_LABEL_COLOR ? hexToFigmaRgb(RT_COLOR_LABEL_COLOR) : autoOnBg;
      const roleLabelColor = RT_ROLE_LABEL_COLOR ? hexToFigmaRgb(RT_ROLE_LABEL_COLOR) : autoOnBgMuted;
      const lineColor = autoOnBg;

      const themeFrame = figma.createFrame();
      themeFrame.name = `${theme.name} Tokens`;
      themeFrame.layoutMode = "VERTICAL";
      themeFrame.primaryAxisSizingMode = "AUTO";
      themeFrame.counterAxisSizingMode = "AUTO";
      themeFrame.cornerRadius = 8;
      themeFrame.itemSpacing = 24;
      themeFrame.paddingLeft = 24;
      themeFrame.paddingRight = 24;
      themeFrame.paddingTop = 24;
      themeFrame.paddingBottom = 24;
      themeFrame.fills = [];
      roleTokensWrapper.appendChild(themeFrame);
      if (tokenCol) {
        const mode = tokenCol.modes.find((m) => m.name.toLowerCase() === theme.name.toLowerCase());
        if (mode) themeFrame.setExplicitVariableModeForCollection(tokenCol, mode.modeId);
      }
      if (scaleCol) {
        const scaleMode = scaleCol.modes.find((m) => m.name.toLowerCase() === theme.name.toLowerCase());
        if (scaleMode) themeFrame.setExplicitVariableModeForCollection(scaleCol, scaleMode.modeId);
      }

      const themeKey = theme.name.toLowerCase();
      const themeTokens = (result.tokens?.[themeKey] || {}) as Record<string, Record<number, Record<number, AnyObj>>>;

      for (const [colorName, roleMap] of Object.entries(themeTokens)) {
        const colorObj = projectStore.colors.find((c: AnyObj) => c.name === colorName);
        if (!colorObj) continue;
        const colorId = colorObj._id;

        const colorLabel = figma.createText();
        colorLabel.fontName = { family: "Inter", style: RT_COLOR_LABEL_STYLE };
        colorLabel.fontSize = RT_COLOR_LABEL_SIZE;
        colorLabel.characters = colorName;
        colorLabel.fills = [{ type: "SOLID", color: colorLabelColor }];
        themeFrame.appendChild(colorLabel);

        const { row: colorRow, content: colorContent } = makeTreeRow(lineColor, RT_COLOR_GAP);
        colorRow.name = colorName;
        themeFrame.appendChild(colorRow);

        for (const [roleIdxStr, varMap] of Object.entries(roleMap as Record<string, Record<number, AnyObj>>)) {
          const roleIdx = parseInt(roleIdxStr, 10);
          const roleObj = projectStore.roles[roleIdx];
          if (!roleObj) continue;

          const varDefs = roleObj.variations ?? projectStore.variations ?? [];

          const roleLabel = figma.createText();
          roleLabel.fontName = { family: "Inter", style: "Bold" };
          roleLabel.fontSize = 16;
          roleLabel.characters = roleObj.name;
          roleLabel.fills = [{ type: "SOLID", color: roleLabelColor }];
          colorContent.appendChild(roleLabel);

          const { row: roleRow, content: roleContent } = makeTreeRow(lineColor, RT_ROLE_GAP);
          roleRow.name = roleObj.name;
          roleContent.layoutMode = "HORIZONTAL";
          roleContent.name = roleObj.name;
          roleContent.itemSpacing = 12;
          colorContent.appendChild(roleRow);

          for (const [varIdxStr, token] of Object.entries(varMap as Record<string, AnyObj>)) {
            if (!token?.value) continue;
            const varIdx = parseInt(varIdxStr, 10);
            const varDef = varDefs[varIdx];
            if (!varDef) continue;

            const tileInst = roleTokenMaster.createInstance();
            tileInst.name = `${colorName} / ${roleObj.name} / ${varDef.name || varIdx}`;
            // Override card fill with the current theme's bg colour
            tileInst.fills = [{ type: "SOLID", color: hexToFigmaRgb(theme.bg) }];
            roleContent.appendChild(tileInst);

            const ref = `token:${colorId}/${roleObj._id}/${varDef._id}`;
            const variable = findVarByRef(ref);
            const solidColor: SolidPaint = { type: "SOLID", color: hexToFigmaRgb(token.value) };

            // @ColorSwatch fill = token colour
            const swatchFrame = tileInst.findOne((n) => n.name === "@ColorSwatch" && n.type === "FRAME") as FrameNode | null;
            if (swatchFrame) {
              if (variable) bindFill(swatchFrame, variable);
              else swatchFrame.fills = [solidColor];
            }

            // @TextSample_lg/md/sm fill = token colour
            for (const sampleName of ["@TextSample_lg", "@TextSample_md", "@TextSample_sm"]) {
              const t = tileInst.findOne((n) => n.name === sampleName) as TextNode | null;
              if (!t) continue;
              if (variable) bindFill(t, variable);
              else t.fills = [solidColor];
            }

            // @ContrastInfo — contrast ratio vs theme bg
            const contrastNode = tileInst.findOne((n) => n.name === "@ContrastInfo") as TextNode | null;
            if (contrastNode) {
              const ratio = token.contrast?.ratio;
              const rating = token.contrast?.rating ?? "";
              contrastNode.characters = ratio != null ? `${Number(ratio).toFixed(1)}:1 ${rating}`.trim() : "—";
            }

            // @HexValue — hex badge on the swatch
            const hexNode = tileInst.findOne((n) => n.name === "@HexValue") as TextNode | null;
            if (hexNode) hexNode.characters = `#${token.value.replace("#", "").toUpperCase()}`;

            // @TokenFullName / @ScaleRef — ink colour = black or white, whichever contrasts more with theme bg
            const inkColor = isColorDark(theme.bg) ? { r: 1, g: 1, b: 1 } : { r: 0, g: 0, b: 0 };
            const inkFill: SolidPaint = { type: "SOLID", color: inkColor };

            const tokenFullName = tileInst.findOne((n) => n.name === "@TokenFullName") as TextNode | null;
            if (tokenFullName) {
              tokenFullName.characters = `${roleObj.name} / ${varDef.name || varIdx}`;
              tokenFullName.fills = [inkFill];
            }

            // @ScaleRef — scale step reference, hidden when not connected
            const scaleRef = tileInst.findOne((n) => n.name === "@ScaleRef") as TextNode | null;
            if (scaleRef) {
              const scaleStep = varDef.scaleStep as string | undefined;
              if (scaleStep) {
                scaleRef.characters = `ref: ${scaleStep}`;
                scaleRef.fills = [{ type: "SOLID", color: inkColor, opacity: 0.5 }];
                scaleRef.visible = true;
              } else {
                scaleRef.visible = false;
              }
            }
          }
        }
        await yieldFrame();
      }
    }

    roleTokensWrapper.setPluginData("renderInProgress", "");
    roleTokensWrapper.setPluginData("sectionFingerprint", rolesFp);
  }

  // ── 10. Love card — create once, never touched again ─────────────────────
  if (!findByRole(outputFrame, "loveCard")) {
    const loveCard = figma.createFrame();
    loveCard.name = "Made with Token Wand";
    loveCard.setPluginData("previewRole", "loveCard");
    loveCard.layoutMode = "VERTICAL";
    loveCard.primaryAxisSizingMode = "AUTO";
    loveCard.counterAxisSizingMode = "AUTO";
    loveCard.primaryAxisAlignItems = "CENTER";
    loveCard.counterAxisAlignItems = "CENTER";
    loveCard.itemSpacing = 4;
    loveCard.paddingLeft = 24;
    loveCard.paddingRight = 24;
    loveCard.paddingTop = 20;
    loveCard.paddingBottom = 20;
    loveCard.cornerRadius = 12;
    loveCard.fills = [{ type: "SOLID", color: { r: 0.06, g: 0.06, b: 0.06 } }];
    outputFrame.appendChild(loveCard);

    const loveTitle = figma.createText();
    loveTitle.fontName = { family: "Inter", style: "Bold" };
    loveTitle.fontSize = 13;
    loveTitle.characters = "✦ Token Wand";
    loveTitle.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    loveTitle.textAutoResize = "WIDTH_AND_HEIGHT";
    loveCard.appendChild(loveTitle);

    const loveSub = figma.createText();
    loveSub.fontName = { family: "Inter", style: "Regular" };
    loveSub.fontSize = 11;
    loveSub.characters = "Made with love";
    loveSub.fills = [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }];
    loveSub.textAutoResize = "WIDTH_AND_HEIGHT";
    loveCard.appendChild(loveSub);
  }

  // All sections complete — clear the interrupted flag.
  clearPreviewInterrupted();
}
