# How to Use Token Wand

## 1. Install and Load

1. Clone or download the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run build` to produce `dist/scripts.js` and `dist/ui.html`.
4. In Figma Desktop, open the Plugins menu → Development → Import plugin from manifest.
5. Select `manifest.json` from the project root.
6. Open any Figma file and run the plugin from Plugins → Development → Token Wand.

On first launch the plugin loads the TW Regular preset. On subsequent launches it restores the last saved configuration for that Figma file.

---

## 2. Choose a Preset or Start from Scratch

Click **Theme Shop** in the top bar to open the preset browser. Each card shows the seed colors, mode, number of roles, and themes. Click **Load [name]** to replace the current configuration with that preset.

**Recommended starting point:** Load **TW Regular**, change the three seed colors to your brand colors, then run. A complete 12-role semantic system in approximately 30 seconds.

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

In the **Token Settings** settings tab:

- **Scale Length** — number of steps in the ramp. 11 for utility palettes, 23–25 for semantic systems.
- **Algorithm** — controls how steps are distributed (see guidelines for selection advice).
- **Scale Step Labels** — optionally override step names. Add individual step label entries (name + optional shorthand) in the Step Labels section. Steps without labels are numbered 1…N automatically.

In **Direct mode**, there is no scale. The plugin skips ramp generation and solves each token color independently. Scale settings are hidden.

Switch between modes using the **Scale / Direct** segmented control in the Token Settings tab.

---

## 5. Define Roles

Navigate to the **Roles** tab (sidebar).

A role is a semantic intent group — Background, Surface, Border, Fill, Text, etc. For each role:

- **Name** — the middle segment of the token path. Use `/` for folder nesting.
- **Shorthand** — optional abbreviation.
- **Variation Targets** — one value per variation. In Scale mode with `contrast` mapping: WCAG contrast ratio targets. In `index` mapping: zero-based scale step indices. In Direct mode: WCAG contrast ratios solved directly.
- **Mapping Method** (Scale mode only) — `contrast` (default: walk scale for first step meeting the WCAG target) or `index` (pin to explicit step number).
- **Custom Variations** — enable to define a custom variation set for this role instead of using the global list.

Enable **Role-specific Variations** in the Token Settings tab to expose the custom variation option per role.

---

## 6. Set Variations

Variations are the steps within a role — e.g. Subtle / Soft / Default / Strong / Bold, or 50 / 100 / 200.

The global variations list is defined in the Token Settings tab (Variations section). Each variation has:

- **Name** — the last segment of the token path.
- **Shorthand** — used when shorthand is enabled.

To give a single role its own variation structure, enable **Role-specific Variations** globally, then toggle the per-role custom variations on that role card.

---

## 7. Configure Themes

Themes define the background color contexts that output tokens are evaluated against.

In the **Project** tab (sidebar), each theme has:

- **Name** — used as the Figma variable mode name, e.g. `Light`, `Dark`, `Brand`.
- **Background Hex** — the background color this theme evaluates against.

Add as many themes as needed. Multiple modes per collection requires a paid Figma plan. The plugin detects plan limitations automatically and warns if modes cannot be added.

---

## 8. Settings Walkthrough

Open **Settings** via the gear icon in the top-right toolbar. Settings is a full-screen overlay with two tabs: **Token Settings** and **Plugin**.

### Token Settings Tab

**Token Creation Mode**
- `Scale` — generates a tonal ramp per color; roles map to scale steps.
- `Direct` — solves each token color directly to a WCAG contrast target; no ramp.

**Use Global Algorithm** toggle
- On (default): all colors use the single global algorithm selector.
- Off: each color card shows its own algorithm or solver mode selector.

**Algorithm** (Scale mode) — Natural, Uniform, Expressive, Symmetric, OKLCH, Material, Linear.

**Solver** (Direct mode, global) — Natural, Constant Chroma, Symmetric, Hue Locked, Max Chroma.

**Solver scope** (Direct mode, global off) — By Color or By Role.

**Palette** — Scale Length input (number of steps, Scale mode only).

**Variations** — Role-specific Variations toggle; Global Variations list (name + shorthand per slot).

**Token Naming**
- Shorthand toggles: Colors, Roles, Variations, Scale Steps.
- Token Name Format: drag pills to reorder the [color, role, variation] path segments; live preview updates.
- Variable Descriptions: write WCAG contrast metadata into Figma variable description fields.

**Collections**
- Palettes collection toggle + name (`_scale` default) — suppressed when disabled or in Direct mode.
- Color role collection name (`color tokens` default).
- Link tokens to color scale toggle (when off, tokens embed hex values instead of Figma aliases).
- Source Colors toggle + collection name (`_constants` default) — raw brand hex, no theme processing.
- Alpha Tints toggle + Alpha Values CSV (only shown when Source Colors is on).

**Scale Step Labels** (Scale mode only) — add individual label entries with name and shorthand for each scale step.

### Plugin Tab

- **UI Scale** — 70% to 150% zoom.
- **UI Theme** — Follow Figma, Dark, Light.

---

## 9. Run and Sync to Figma

Click **Run** to open the Run dialog. The dialog shows:

- Existing collections in the current Figma file that match configured collection names.
- A rename summary: variables that will be renamed in place due to color or role label changes.
- A **Scope** selector:
  - `all` ("Everything") — rebuild the scale collection and the token collection.
  - `scale` ("Scale Only") — rebuild the scale collection only.
  - `roles` ("Roles Only") — rebuild the token collection only (skips scale regeneration — faster for token-only changes).

Click **Sync** to write variables to Figma. A tally shows how many variables were created, updated, renamed, or failed.

---

## 10. Exports

Use the export buttons in the **•••** (More Options) sheet to download:

- **CSS** — custom properties in `:root` (scales) and `[data-theme="name"]` blocks (tokens), with `@media (prefers-color-scheme: dark)` fallback.
- **SCSS** — flat scale variables, per-color scale maps, per-theme token maps, an `apply-theme` mixin, and theme selector blocks.
- **CSV** — an audit sheet with color, step, hex, contrast ratios, and ratings for both scales and role tokens.
- **JSON** — full plugin state including config, scales, tokens, and errors. Also usable to restore plugin state.

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

**Current limitation:** Per-role custom variation renames are not tracked — renaming a custom variation creates a new variable instead of renaming the old one.

---

## 12. Tips

**Use `/` in names for Figma folder nesting.** `Brand/Primary` and `Surface/Raised` create nested folder groups in the Figma variable panel.

**Flat Tailwind-style names:** Set `tokenNameSegments: ["color", "variation"]` (two elements, no role) and enable shorthand. With color `bl` and variation `500`, the output is `bl/500`. Full names produce `Blue/500`.

**Descriptions** — enable in Token Settings to write contrast ratios into each variable's description. Useful for accessibility audits without leaving Figma.

**JSON export/import** — the JSON export contains the full plugin config. Commit it to version-control the token configuration.

**Scope: roles only** — after the initial sync, use `roles` scope to skip scale regeneration and sync significantly faster.

**Preview panel** — review all computed token hex values before syncing to Figma.

**Per-role variation override** — use when a role needs a fundamentally different structure than the global one. Status colors are the common case: `BG/Subtle`, `BG/Default`, `FG/Default`, `Border` are four purpose-specific slots.

**Alpha Tints** — enable Source Colors + Alpha Tints in Token Settings. Configures RGBA variables at `ColorName/Opacities/10`, `ColorName/Opacities/25`, etc.
