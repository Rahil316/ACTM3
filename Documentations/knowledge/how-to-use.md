# How to Use Token Wand

## 1. Install and Load

1. Clone or download the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run build` to produce `dist/scripts.js` and `dist/ui.html`.
4. In Figma Desktop, open the Plugins menu → Development → Import plugin from manifest.
5. Select `manifest.json` from the project root.
6. Open any Figma file and run the plugin from Plugins → Development → Token Wand.

On first launch (no saved state yet), the plugin shows the **QuickStart** screen — a picker over 8 curated presets (Regular Wand, Material 3, Atlassian, Radix UI, Apple HIG, Tailwind CSS, IBM Carbon, Shopify Polaris), plus a "Browse Presets" link into the full Theme Shop. Nothing loads automatically; you pick one. On subsequent launches the plugin restores the last saved configuration for that Figma file instead.

---

## 2. Choose a Preset or Start from Scratch

Click **Theme Shop** in the top bar to open the full preset browser (more options than the first-launch QuickStart screen). Each card shows the seed colors, mode, number of roles, and themes. Click **Load [name]** to replace the current configuration with that preset.

**Recommended starting point:** Load **Regular Wand**, change the three seed colors to your brand colors, then run. A complete 12-role semantic system in approximately 30 seconds. Note: Regular Wand is a dev-only preset — available when running from source (`npm run build`/`watch`) but not included in `--release` builds; for a shipped-build equivalent, any of the 7 shipped presets (Apple HIG, Atlassian, IBM Carbon, Material 3, Shopify Polaris, Radix UI, Tailwind CSS) works the same way.

---

## 3. Add Colors

Navigate to the **Palette** tab (sidebar).

For each brand color:

- **Name** — used in Figma variable paths. Use `/` to create folder nesting, e.g. `Brand/Primary`.
- **Hex** — the seed color, e.g. `0066FF`. No `#` required.
- **Shorthand** — optional abbreviation used in token names when shorthand is enabled, e.g. `bp`.
- **Description** — written into Figma variable descriptions when descriptions are enabled.

Three to six colors is typical: one neutral, one or two brand colors, and status colors (error, success, warning).

---

## 4. Configure Scale (Scale Mode) or Skip (Direct Mode)

In **Scale mode**, the plugin generates a tonal ramp for each color before mapping roles onto it.

In the **Tokens** settings tab:

- **Scale Length** — number of steps in the ramp. 11 for utility palettes, 23–25 for semantic systems.
- **Algorithm** — controls how steps are distributed (see guidelines for selection advice).

Step names can be overridden in the **Step Labels** card on the **Labels** settings tab — add individual entries (name + optional shorthand) per step. Steps without labels are numbered 1…N automatically.

In **Direct mode**, there is no scale. The plugin skips ramp generation and solves each token color independently. Scale settings are hidden.

Switch between modes using the **Scale / Direct** segmented control in the Tokens settings tab.

---

## 5. Define Roles

Navigate to the **Roles** tab (sidebar).

A role is a semantic intent group — Background, Surface, Border, Fill, Text, etc. For each role:

- **Name** — the middle segment of the token path. Use `/` for folder nesting.
- **Shorthand** — optional abbreviation.
- **Contrast Target** — set per variation (in the variation table, not on the role itself): a WCAG contrast ratio. In Scale mode, the engine walks the scale for the first step meeting this target; in Direct mode, it's solved directly. There is no "mapping method" setting and no index-based mapping — every role always resolves by contrast.
- **Custom Variations** — enable to define a custom variation set for this role instead of using the global list.

Enable **Custom Variations per role** on the Labels settings tab to expose the custom variation option per role.

---

## 6. Set Variations

Variations are the steps within a role — e.g. Subtle / Soft / Default / Strong / Bold, or 50 / 100 / 200.

The global variations list is defined in the Labels settings tab (Shared Variations card). Each variation has:

- **Name** — the last segment of the token path.
- **Shorthand** — used when shorthand is enabled.
- **Target** — WCAG contrast target for this tier.

To give a single role its own variation structure, enable **Custom Variations per role** on the Labels tab, then edit that role's variations on its role card.

---

## 7. Configure Themes

Themes define the background color contexts that output tokens are evaluated against.

In the **Project** tab (sidebar), each theme has:

- **Name** — used as the Figma variable mode name, e.g. `Light`, `Dark`, `Brand`.
- **Background Hex** — the background color this theme evaluates against.

Add as many themes as needed. Multiple modes per collection requires a paid Figma plan. The plugin detects plan limitations automatically and warns if modes cannot be added.

---

## 8. Settings Walkthrough

Open **Settings** via the gear icon in the top-right toolbar. Settings is a full-screen overlay with three tabs: **Tokens**, **Labels**, and **Plugin**. Changes only persist if you click **Done** — clicking **Cancel**, or closing the plugin without clicking either, discards everything changed since Settings was opened.

### Tokens Tab

**Token Creation Mode**
- `Scale` — generates a tonal ramp per color; roles map to scale steps.
- `Direct` — solves each token color directly to a WCAG contrast target; no ramp.

**Uniform Algorithm** toggle
- On (default): all colors use the single global algorithm selector.
- Off: each color card shows its own algorithm or solver mode selector.

**Algorithm** (Scale mode) — Natural, Uniform, Expressive, Symmetric, OKLCH, Material, Linear, Fidelity.

**Solver** (Direct mode, global) — Natural, Constant Chroma, Symmetric, Hue Locked, Max Chroma.

**Algorithm Scope** (Uniform Algorithm off) — Per Color or Per Role.

**Palette** — Scale Length input (number of steps, Scale mode only).

**Token Naming**
- Shorthand toggles: Colors, Roles, Variations, Scale Steps.
- Token Name Format: drag pills to reorder the [color, role, variation] path segments; live preview updates.
- Variable Descriptions: write WCAG contrast metadata into Figma variable description fields.

**Collections** — each collection row is checkbox + label + name input in one row (click the checkbox to enable/disable; the name input disables when the row is off).
- Token Collection — always on, can't be disabled (`color tokens` default name).
- Scale Collection toggle + name (`_scale` default) — Scale mode only.
- Source Collection toggle + name (`_constants` default) — raw brand hex, no theme processing. Alpha Tint Values (comma-separated %) shown only when this is on.

### Labels Tab

**Custom Variations per role** toggle — off by default (shared variations apply to every role). Turning it on is a one-way sync: every role's variation list is rebuilt from whatever Shared Variations currently holds (existing per-role contrast targets are preserved by position; new slots get the shared default target). Turning it back off reverts every role to following Shared Variations directly.

**Shared Variations** (hidden while Custom Variations per role is on) — the list of variation tiers (e.g. Subtle/Soft/Default/Strong/Bold) with name, shorthand, and contrast target, applied to every role. "+ Add Variation" appends a row; "Reset to Defaults" restores the five built-in tiers.

**Step Labels** (Scale mode only) — name each scale step (e.g. instead of showing "1, 2, 3…"). Add/remove rows with the per-row `+`/remove buttons; "Reset to Defaults" renumbers everything back to `1…N`.

### Plugin Tab

- **UI Scale** — 70% to 150% zoom.
- **UI Theme** — Follow Figma, Dark, Light.

---

## 9. Run and Sync to Figma

Click **Run** to open the Run dialog. The dialog shows:

- Existing collections in the current Figma file that match configured collection names.
- A rename summary: variables that will be renamed in place due to color or role label changes.
- A **collections checklist**, not a single scope dropdown: independent "Scale" and "Tokens" toggle rows (each with its own editable collection-name field), plus a separate "Source Colors" toggle. Their combination determines what gets rebuilt:
  - Scale on + Tokens on — rebuild both the scale collection and the token collection.
  - Scale on + Tokens off — rebuild the scale collection only.
  - Scale off + Tokens on — rebuild the token collection only (skips scale regeneration — faster for token-only changes).
  - Source Colors is independent of the other two and always syncs when enabled, regardless of their state.

Click **Sync** to write variables to Figma. A tally shows how many variables were created, updated, renamed, or failed.

---

## 10. Exports

Use the export buttons in the **•••** (More Options) sheet to download. Eleven formats are available:

- **Token Wand Config (.wand)** — full plugin state snapshot; re-importable to restore the project.
- **CSS** — custom properties in `:root` (scales) and `[data-theme="name"]` blocks (tokens), with `@media (prefers-color-scheme: dark)` fallback.
- **SCSS** — flat scale variables, per-color scale maps, per-theme token maps, an `apply-theme` mixin, and theme selector blocks.
- **Tailwind Config** — a `tailwind.config.js` extending `theme.colors`, plus companion CSS files.
- **W3C Design Tokens (DTCG)** — scale and per-theme token files in the W3C Design Token Community Group JSON format.
- **Style Dictionary** — a `global.json` scale source plus per-theme token override files.
- **iOS / Swift** — one `{Theme}Colors.swift` file per theme with static Color properties.
- **Android XML** — `res/{qualifier}/colors.xml` per theme (uses Android's native `values`/`values-night` qualifiers where they apply, `values-{theme}` otherwise).
- **React Native** — a TypeScript `tokens/index.ts` barrel plus a typed per-theme token file.
- **CSV** — an audit sheet with color, step, hex, contrast ratios, and ratings for both scales and role tokens.
- **JSON** — raw scales/tokens/errors data (not the full plugin config — use the `.wand` export to restore plugin state).

Exports do not require a Figma sync first — they run directly from the current UI state.

---

## 11. Iterating Without Losing Variable References

Token Wand prevents broken variable references by:

1. Assigning a stable `_id` to every color and role at creation.
2. On each sync, comparing `_id` values between the saved state and the new state to detect renames.
3. Renaming existing Figma variables in place rather than deleting and recreating them.

To safely rename a color or role:

- Change the name in the plugin UI.
- Run a sync. The Run dialog shows the rename summary before committing.
- The variable is renamed in Figma; all references remain intact.

To safely reorder colors or roles: drag to reorder, then sync. `_id` tracking ensures the right variables are renamed.

Variation renames — including per-role custom variation lists — are tracked by `_id` the same way colors and roles are (`src/figma/config.ts:236-245`), so renaming a variation (global or per-role) renames the existing Figma variable rather than creating a new one.

---

## 12. Tips

**Use `/` in names for Figma folder nesting.** `Brand/Primary` and `Surface/Raised` create nested folder groups in the Figma variable panel.

**Flat Tailwind-style names:** Set `tokenNameSegments: ["color", "variation"]` (two elements, no role) and enable shorthand. With color `bl` and variation `500`, the output is `bl/500`. Full names produce `Blue/500`.

**Descriptions** — enable in the Tokens tab to write contrast ratios into each variable's description. Useful for accessibility audits without leaving Figma.

**Config export/import** — use the **Token Wand Config (.wand)** export (not the JSON export, which only contains raw scales/tokens/errors) to commit the full plugin config to version control. Re-import it via the import button to restore a project.

**Tokens-only sync** — after the initial sync, turn off the "Scale" toggle in the Run dialog's collections checklist to skip scale regeneration and sync significantly faster when only roles/tokens changed.

**Preview panel** — review all computed token hex values before syncing to Figma.

**Per-role variation override** — use when a role needs a fundamentally different structure than the global one. Status colors are the common case: `BG/Subtle`, `BG/Default`, `FG/Default`, `Border` are four purpose-specific slots.

**Alpha Tints** — enable Source Collection in the Tokens tab, then set Alpha Tint Values (comma-separated percentages). Configures RGBA variables at `ColorName/Opacities/10`, `ColorName/Opacities/25`, etc.
