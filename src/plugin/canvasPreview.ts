// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any;

import { hexToFigmaRgb, isColorDark, bindFill } from "./figmaComponents/helpers";
import { contrastRatio, contrastRating } from "../shared/clrUtils";
import { buildScaleStepMaster } from "./figmaComponents/ScaleStepTile";
import { buildSourceAlphaMaster } from "./figmaComponents/SourceAlphaTile";
import { buildRoleTokenMaster } from "./figmaComponents/RoleTokenTile";

// Yield to the Figma main thread so the UI doesn't freeze between heavy batches
function yieldFrame(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS LAYOUT CONTROLS — tune these to adjust the preview appearance
// ─────────────────────────────────────────────────────────────────────────────

// ── Top-level positioning ─────────────────────────────────────────────────────
const TOKEN_COL_GAP = 40; // horizontal gap between theme columns

// ── Theme container ───────────────────────────────────────────────────────────
const RT_THEME_PADDING = 32; // padding on all 4 sides
const RT_THEME_GAP = 32; // gap between colour groups
const RT_THEME_RADIUS = 0; // corner radius (0 = sharp)
// fill comes from theme.bg — set RT_THEME_FILL_OPACITY to override opacity (1 = opaque)
const RT_THEME_FILL_OPACITY = 1;

// ── Color group container ─────────────────────────────────────────────────────
const RT_COLOR_PADDING = 0; // inner padding
const RT_COLOR_GAP = 16; // gap between role groups within a colour
const RT_COLOR_RADIUS = 0;
const RT_COLOR_FILL = ""; // '' = transparent, or any hex e.g. '#ffffff10'
// colour label text
const RT_COLOR_LABEL_SIZE = 13;
const RT_COLOR_LABEL_STYLE = "Bold" as const; // 'Bold' | 'Medium' | 'Regular'
// label colour is derived from theme bg (auto light/dark) — override below:
const RT_COLOR_LABEL_COLOR = ""; // '' = auto, or hex e.g. '#ffffff'

// ── Role group container ──────────────────────────────────────────────────────
const RT_ROLE_PADDING = 0;
const RT_ROLE_GAP = 4; // gap between variation tiles
const RT_ROLE_RADIUS = 0;
const RT_ROLE_FILL = ""; // '' = transparent
// role label text
const RT_ROLE_LABEL_SIZE = 11;
const RT_ROLE_LABEL_STYLE = "Medium" as const;
const RT_ROLE_LABEL_COLOR = ""; // '' = auto (muted version of theme on-bg)

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

export async function generateCanvasPreview(appState: AnyObj, result?: AnyObj): Promise<void> {
  const { translateConfig } = await import("./config");
  const cfg = translateConfig(appState);
  if (!result) {
    const { variableMaker } = await import("../shared/clrEngine.js");
    result = variableMaker(cfg);
  }

  // 1. Destroy existing preview page and recreate fresh
  const existingPage = figma.root.children.find((p) => p.getPluginData("previewPage") === "1") as PageNode | undefined;
  if (existingPage) {
    try {
      existingPage.remove();
    } catch {
      /* ignore */
    }
  }
  const previewPage = figma.createPage();
  previewPage.name = "✦ Token Preview";
  previewPage.setPluginData("previewPage", "1");

  await figma.setCurrentPageAsync(previewPage);

  // 2. Load fonts
  await Promise.all([figma.loadFontAsync({ family: "Inter", style: "Bold" }), figma.loadFontAsync({ family: "Inter", style: "Medium" }), figma.loadFontAsync({ family: "Inter", style: "Regular" })]);

  // 3. Resolve collections and variables
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const tokenColName = appState.tokenCollectionName || "color tokens";
  const scaleColName = appState.scaleCollectionName || "_scale";
  const tokenCol = collections.find((c) => c.name === tokenColName) || null;
  const scaleCol = collections.find((c) => c.name === scaleColName) || null;

  const allVars = await figma.variables.getLocalVariablesAsync();
  const findVarByRef = (ref: string) => allVars.find((v) => v.getPluginData("tokenRef") === ref);

  const includeScales = appState.includeColorScalesCollection !== false;
  const includeSource = appState.includeSourceColors === true;
  const themes: AnyObj[] = appState.themes || [];

  // 4. Build master components (off-screen)
  const alphaValues: number[] = (appState.alphaValues || "10,25,50,75,90")
    .split(",")
    .map((v: string) => parseInt(v.trim(), 10))
    .filter((v: number) => !isNaN(v));

  const scaleStepMaster = buildScaleStepMaster(themes);
  scaleStepMaster.x = 0;
  scaleStepMaster.y = -600;
  previewPage.appendChild(scaleStepMaster);

  const sourceAlphaMaster = buildSourceAlphaMaster(alphaValues.length, themes);
  sourceAlphaMaster.x = 360;
  sourceAlphaMaster.y = -600;
  previewPage.appendChild(sourceAlphaMaster);

  const roleTokenMaster = buildRoleTokenMaster();
  roleTokenMaster.x = 1020;
  roleTokenMaster.y = -600;
  previewPage.appendChild(roleTokenMaster);

  // ── Root output container ─────────────────────────────────────────────────
  const outputFrame = figma.createFrame();
  outputFrame.name = "Token Preview Output";
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

  // ── 5. Source + Alpha container (theme-independent) ────────────────────────
  if (includeSource && (appState.colors || []).length > 0) {
    const sourceContainer = figma.createFrame();
    sourceContainer.name = "Source Colors";
    sourceContainer.layoutMode = "VERTICAL";
    sourceContainer.primaryAxisSizingMode = "AUTO";
    sourceContainer.counterAxisSizingMode = "AUTO";
    sourceContainer.itemSpacing = 24;
    sourceContainer.paddingLeft = 24;
    sourceContainer.paddingRight = 24;
    sourceContainer.paddingTop = 24;
    sourceContainer.paddingBottom = 24;
    sourceContainer.fills = [];
    outputFrame.appendChild(sourceContainer);

    for (const color of appState.colors || []) {
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
  }

  // ── 6. Scale container (theme-independent) ────────────────────────────────
  // Effective step list: use named steps if present, otherwise fall back to numeric series
  const effectiveStepNames: AnyObj[] = Array.isArray(cfg.scaleStepNames) && cfg.scaleStepNames.length > 0 ? cfg.scaleStepNames : Array.from({ length: cfg.scaleLength ?? 23 }, (_, i) => ({ _id: String(i + 1), name: String(i + 1) }));

  if (includeScales && effectiveStepNames.length > 0) {
    const scaleContainer = figma.createFrame();
    scaleContainer.name = "Color Scales";
    scaleContainer.layoutMode = "HORIZONTAL";
    scaleContainer.primaryAxisSizingMode = "AUTO";
    scaleContainer.counterAxisSizingMode = "AUTO";
    scaleContainer.itemSpacing = 24;
    scaleContainer.paddingLeft = 24;
    scaleContainer.paddingRight = 24;
    scaleContainer.paddingTop = 24;
    scaleContainer.paddingBottom = 24;
    scaleContainer.fills = [];
    outputFrame.appendChild(scaleContainer);

    for (const color of appState.colors || []) {
      const colorCol = figma.createFrame();
      colorCol.name = color.name;
      colorCol.layoutMode = "VERTICAL";
      colorCol.primaryAxisSizingMode = "AUTO";
      colorCol.counterAxisSizingMode = "AUTO";
      colorCol.itemSpacing = 2;
      colorCol.fills = [];
      scaleContainer.appendChild(colorCol);

      for (const step of effectiveStepNames) {
        const tileInst = scaleStepMaster.createInstance();
        tileInst.name = step.name || step._id;
        colorCol.appendChild(tileInst);

        const swatchNode = tileInst.findOne((n) => n.name === "Swatch") as RectangleNode | null;
        if (swatchNode) {
          const scaleVar = findVarByRef(`scale:${color._id}/${step._id}`);
          if (scaleVar) bindFill(swatchNode, scaleVar);
          else {
            const hex = getResultScaleHex(result, color.name, step.name || step._id);
            swatchNode.fills = hex ? [{ type: "SOLID", color: hexToFigmaRgb(hex) }] : [{ type: "SOLID", color: { r: 0.85, g: 0.85, b: 0.85 } }];
          }
        }

        const hexNode = tileInst.findOne((n) => n.name === "Hex Code") as TextNode | null;
        if (hexNode) {
          const hex = getResultScaleHex(result, color.name, step.name || step._id);
          hexNode.characters = hex ? `#${hex.replace("#", "").toUpperCase()}` : "—";
        }

        const stepNameNode = tileInst.findOne((n) => n.name === "Step Name") as TextNode | null;
        if (stepNameNode) stepNameNode.characters = step.name || step._id;

        // Contrast per theme — engine keys contrast by theme.name.toLowerCase()
        const scaleEntry = (result?.scales?.[color.name] as Record<string, AnyObj> | undefined)?.[step.name || step._id];
        for (const theme of themes) {
          const badgeNode = tileInst.findOne((n) => n.name === `Contrast ${theme.name}`) as TextNode | null;
          if (!badgeNode) continue;
          const cr = scaleEntry?.contrast?.[theme.name.toLowerCase()] as AnyObj | undefined;
          badgeNode.characters = cr?.ratio != null ? `${theme.name} ${Number(cr.ratio).toFixed(1)}:1 ${cr.rating ?? ""}`.trim() : `${theme.name} —`;
        }
      }
      await yieldFrame();
    }
  }

  // ── 7. Role token containers (one per theme, side by side) ─────────────────

  // Outer wrapper — created once, themes sit inside it horizontally
  const roleTokensWrapper = figma.createFrame();
  roleTokensWrapper.name = "Role Tokens";
  roleTokensWrapper.layoutMode = "HORIZONTAL";
  roleTokensWrapper.primaryAxisSizingMode = "AUTO";
  roleTokensWrapper.counterAxisSizingMode = "AUTO";
  roleTokensWrapper.itemSpacing = TOKEN_COL_GAP;
  roleTokensWrapper.fills = [];
  outputFrame.appendChild(roleTokensWrapper);

  for (const theme of themes) {
    const isBgDark = isColorDark(theme.bg);
    const autoOnBg = isBgDark ? { r: 0.95, g: 0.95, b: 0.95 } : { r: 0.08, g: 0.08, b: 0.08 };
    const autoOnBgMuted = isBgDark ? { r: 0.7, g: 0.7, b: 0.7 } : { r: 0.45, g: 0.45, b: 0.45 };
    const colorLabelColor = RT_COLOR_LABEL_COLOR ? hexToFigmaRgb(RT_COLOR_LABEL_COLOR) : autoOnBg;
    const roleLabelColor = RT_ROLE_LABEL_COLOR ? hexToFigmaRgb(RT_ROLE_LABEL_COLOR) : autoOnBgMuted;

    const themeFrame = figma.createFrame();
    themeFrame.name = `${theme.name} Tokens`;
    themeFrame.layoutMode = "VERTICAL";
    themeFrame.primaryAxisSizingMode = "AUTO";
    themeFrame.counterAxisSizingMode = "AUTO";
    themeFrame.cornerRadius = RT_THEME_RADIUS;
    themeFrame.itemSpacing = RT_THEME_GAP;
    themeFrame.paddingLeft = RT_THEME_PADDING;
    themeFrame.paddingRight = RT_THEME_PADDING;
    themeFrame.paddingTop = RT_THEME_PADDING;
    themeFrame.paddingBottom = RT_THEME_PADDING;
    themeFrame.fills = [{ type: "SOLID", color: hexToFigmaRgb(theme.bg), opacity: RT_THEME_FILL_OPACITY }];
    roleTokensWrapper.appendChild(themeFrame);

    // Bind variable modes to this frame
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
      const colorObj = appState.colors.find((c: AnyObj) => c.name === colorName);
      if (!colorObj) continue;
      const colorId = colorObj._id;

      // Colour group
      const colorGroup = figma.createFrame();
      colorGroup.name = colorName;
      colorGroup.layoutMode = "VERTICAL";
      colorGroup.primaryAxisSizingMode = "AUTO";
      colorGroup.counterAxisSizingMode = "AUTO";
      colorGroup.cornerRadius = RT_COLOR_RADIUS;
      colorGroup.itemSpacing = RT_COLOR_GAP;
      colorGroup.paddingLeft = RT_COLOR_PADDING;
      colorGroup.paddingRight = RT_COLOR_PADDING;
      colorGroup.paddingTop = RT_COLOR_PADDING;
      colorGroup.paddingBottom = RT_COLOR_PADDING;
      colorGroup.fills = RT_COLOR_FILL ? [{ type: "SOLID", color: hexToFigmaRgb(RT_COLOR_FILL) }] : [];
      themeFrame.appendChild(colorGroup);

      const colorLabel = figma.createText();
      colorLabel.fontName = { family: "Inter", style: RT_COLOR_LABEL_STYLE };
      colorLabel.fontSize = RT_COLOR_LABEL_SIZE;
      colorLabel.characters = colorName;
      colorLabel.fills = [{ type: "SOLID", color: colorLabelColor }];
      colorGroup.appendChild(colorLabel);

      for (const [roleIdxStr, varMap] of Object.entries(roleMap as Record<string, Record<number, AnyObj>>)) {
        const roleIdx = parseInt(roleIdxStr, 10);
        const roleObj = appState.roles[roleIdx];
        if (!roleObj) continue;

        const varDefs = roleObj.customVariationList && roleObj.customVariations?.length ? roleObj.customVariations : appState.variations || [];

        // Role name label
        const roleLabel = figma.createText();
        roleLabel.fontName = { family: "Inter", style: RT_ROLE_LABEL_STYLE };
        roleLabel.fontSize = RT_ROLE_LABEL_SIZE;
        roleLabel.characters = roleObj.name;
        roleLabel.fills = [{ type: "SOLID", color: roleLabelColor }];
        colorGroup.appendChild(roleLabel);

        // Role group
        const roleGroup = figma.createFrame();
        roleGroup.name = roleObj.name;
        roleGroup.layoutMode = "HORIZONTAL";
        roleGroup.primaryAxisSizingMode = "AUTO";
        roleGroup.counterAxisSizingMode = "AUTO";
        roleGroup.cornerRadius = RT_ROLE_RADIUS;
        roleGroup.itemSpacing = RT_ROLE_GAP;
        roleGroup.paddingLeft = RT_ROLE_PADDING;
        roleGroup.paddingRight = RT_ROLE_PADDING;
        roleGroup.paddingTop = RT_ROLE_PADDING;
        roleGroup.paddingBottom = RT_ROLE_PADDING;
        roleGroup.fills = RT_ROLE_FILL ? [{ type: "SOLID", color: hexToFigmaRgb(RT_ROLE_FILL) }] : [];
        colorGroup.appendChild(roleGroup);

        for (const [varIdxStr, token] of Object.entries(varMap as Record<string, AnyObj>)) {
          if (!token?.value) continue;
          const varIdx = parseInt(varIdxStr, 10);
          const varDef = varDefs[varIdx];
          if (!varDef) continue;

          const tileName = `${colorName} / ${roleObj.name} / ${varDef.name || varIdx}`;
          const tileInst = roleTokenMaster.createInstance();
          tileInst.name = tileName;
          roleGroup.appendChild(tileInst);

          const ref = `token:${colorId}/${roleObj._id}/${varDef._id}`;
          const variable = findVarByRef(ref);
          const solidColor: SolidPaint = { type: "SOLID", color: hexToFigmaRgb(token.value) };

          // Swatch frame fill = token colour
          const swatchFrame = tileInst.findOne((n) => n.name === "Swatch" && n.type === "FRAME") as FrameNode | null;
          if (swatchFrame) {
            if (variable) bindFill(swatchFrame, variable);
            else swatchFrame.fills = [solidColor];
          }

          // "Aa" texts = token colour
          for (const aaName of ["Aa Bold", "Aa Medium", "Aa Regular"]) {
            const aa = tileInst.findOne((n) => n.name === aaName) as TextNode | null;
            if (!aa) continue;
            if (variable) bindFill(aa, variable);
            else aa.fills = [solidColor];
          }

          // Contrast vs theme background
          const contrastNode = tileInst.findOne((n) => n.name === "Contrast vs Theme BG") as TextNode | null;
          if (contrastNode) {
            const ratio = token.contrast?.ratio;
            const rating = token.contrast?.rating ?? "";
            contrastNode.characters = ratio != null ? `${Number(ratio).toFixed(1)}:1 ${rating}`.trim() : "—";
          }

          // Hex badge
          const hexNode = tileInst.findOne((n) => n.name === "Hex Code") as TextNode | null;
          if (hexNode) hexNode.characters = `#${token.value.replace("#", "").toUpperCase()}`;

          // Role token name badge
          const roleNode = tileInst.findOne((n) => n.name === "Role Token Name") as TextNode | null;
          if (roleNode) roleNode.characters = `${roleObj.name} / ${varDef.name || varIdx}`;

          // Referee scale step — hide container if not connected
          const refText = tileInst.findOne((n) => n.name === "Referee Scale Step") as TextNode | null;
          if (refText) {
            const scaleStep = varDef.scaleStep as string | undefined;
            if (scaleStep) {
              refText.characters = scaleStep;
            } else {
              const refContainer = refText.parent as FrameNode | null;
              if (refContainer) refContainer.visible = false;
            }
          }
        }
      }
      await yieldFrame(); // yield after each colour group per theme
    }
  }

  // ── With love card ────────────────────────────────────────────────────────
  const loveCard = figma.createFrame();
  loveCard.name = "Made with Token Wand";
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
