# Cheatsheet — Role Names, Variation Names & Contrast Targets

## Standard Variation Sets

### Semantic Intensity (5-level) — recommended for most product systems

| Variation | Contrast Target | Typical use                                      |
| --------- | --------------- | ------------------------------------------------ |
| Subtle    | 1.1             | Barely-visible background tints, page washes     |
| Soft      | 1.4             | Slightly visible surfaces, hover backgrounds     |
| Default   | 2.5             | Primary use of this role (borders, fills, icons) |
| Strong    | 5.0             | Prominent usage — heavier borders, active fills  |
| Bold      | 9.0             | Maximum usage — heavy text, strong fills         |

### Interaction States (4-level)

| Variation | Contrast Target | Typical use                     |
| --------- | --------------- | ------------------------------- |
| Rest      | 4.5             | Default resting state           |
| Hover     | 5.5             | Mouse-over, pointer-over        |
| Pressed   | 7.0             | Active / mouse-down             |
| Disabled  | 2.0             | Visually inert, not interactive |

### Interaction States (5-level — Polaris-style)

| Variation | Contrast Target | Typical use                  |
| --------- | --------------- | ---------------------------- |
| Default   | 4.5             | Resting state                |
| Hover     | 5.5             | Mouse-over                   |
| Pressed   | 6.5             | Active / mouse-down          |
| Selected  | 7.0             | Selected / checked / toggled |
| Disabled  | 2.0             | Visually inert               |

### Emphasis Hierarchy (4-level — Apple / Material-style)

| Variation | Contrast Target | Typical use                  |
| --------- | --------------- | ---------------------------- |
| High      | 7.0             | Primary label, heading — AAA |
| Medium    | 4.5             | Secondary label, body — AA   |
| Low       | 3.0             | Tertiary label, placeholder  |
| Disabled  | 2.0             | Quaternary / disabled text   |

### Utility Scale (11-level — Tailwind-style)

| Variation | Contrast Target | Notes                             |
| --------- | --------------- | --------------------------------- |
| 50        | 1.0             | Near-white tint                   |
| 100       | 1.1             |                                   |
| 200       | 1.3             |                                   |
| 300       | 1.6             |                                   |
| 400       | 2.5             |                                   |
| 500       | 4.0             | Mid-point — brand color territory |
| 600       | 5.5             |                                   |
| 700       | 7.5             | AA text                           |
| 800       | 11.0            |                                   |
| 900       | 16.0            |                                   |
| 950       | 20.0            | Near-black                        |

**Caveat — low targets are hue-sensitive in Scale mode:** the low end of this scale (50–300, targets 1.0–1.6) and the `Subtle` columns below assume a hue-neutral ramp. In Scale mode, `Natural`, `Uniform`, `Expressive`, and `Symmetric` binary-search HSL lightness against a target that isn't actually hue-uniform (see `Documentations/knowledge/color-algorithm-roadmap.md`'s "Confirmed issues" entry on this) — a yellow/lime/warm-green seed will hit these low-contrast steps at a very different, more washed-out HSL lightness than a blue/violet seed will, so the same numeric target can look meaningfully different across seed colors. For warm seeds, prefer `OKLCH`, `Material`, or `Fidelity` (see `color-system-guidelines.md`'s Algorithm Selection Guide), which don't have this skew.

---

## Standard Roles with Recommended Contrast Targets

Columns show suggested per-variation contrast `target` values for a 3-variation model (Subtle / Default / Strong) — there is no role-level `variationTargets` array; each variation in `role.variations` (or the global list) carries its own `target`.

| Role                | Purpose                             | Subtle | Default | Strong |
| ------------------- | ----------------------------------- | ------ | ------- | ------ |
| `Background`        | Page wash                           | 1.0    | 1.05    | 1.2    |
| `Background/Subtle` | Off-white section backgrounds       | 1.1    | 1.35    | 1.8    |
| `Surface`           | Card / panel backgrounds            | 1.35   | 1.8     | 2.7    |
| `Surface/Raised`    | Elevated cards, popovers            | 1.8    | 2.7     | 4.0    |
| `Border`            | General UI dividers                 | 2.7    | 4.0     | 5.8    |
| `Border/Strong`     | Form field borders, active outlines | 4.0    | 5.8     | 8.5    |
| `Fill`              | Interactive component fills         | 2.7    | 5.8     | 11.5   |
| `Fill/Strong`       | CTA buttons, primary actions        | 4.0    | 8.5     | 14.5   |
| `Text/Muted`        | Placeholder, caption, helper text   | 7.0    | 10.0    | 13.0   |
| `Text`              | Body copy (AA)                      | 10.0   | 13.0    | 16.0   |
| `Text/Strong`       | Headings, labels (AAA)              | 13.0   | 16.0    | 19.0   |
| `Text/Inverse`      | Text on colored backgrounds         | 4.5    | 7.0     | 10.0   |

### Status Role Slots (per-role override — 4 variations)

| Role                         | Slot name    | Contrast Target | Purpose                 |
| ---------------------------- | ------------ | --------------- | ----------------------- |
| `Status/Error` (and similar) | `BG/Subtle`  | 1.3             | Tinted alert background |
|                              | `BG/Default` | 1.8             | Solid alert background  |
|                              | `FG/Default` | 4.5             | Status text and icon    |
|                              | `Border`     | 2.5             | Status outline/border   |

### Action Role Slots (4-state interaction — 4 variations)

| Role               | Variation | Contrast Target | Purpose        |
| ------------------ | --------- | --------------- | -------------- |
| `Action/Primary`   | Rest      | 4.5             | Default fill   |
|                    | Hover     | 6.0             | Hover fill     |
|                    | Pressed   | 7.0             | Active fill    |
|                    | Disabled  | 2.0             | Inactive state |
| `Action/Secondary` | Rest      | 3.0             | Default fill   |
|                    | Hover     | 4.5             | Hover fill     |
|                    | Pressed   | 6.0             | Active fill    |
|                    | Disabled  | 2.0             | Inactive state |

### Inverse Role Slots (2 variations)

| Role              | Variation | Contrast Target | Purpose                          |
| ----------------- | --------- | --------------- | -------------------------------- |
| `Inverse/Surface` | Default   | 12.0            | Dark tooltip / badge background  |
|                   | Muted     | 14.0            | Slightly lighter inverse surface |
| `On/Primary`      | Default   | 4.5             | Text on primary fill — AA        |
|                   | Strong    | 7.0             | Text on primary fill — AAA       |

---

## WCAG Quick Reference

- **1.0:1** — identical to background (invisible)
- **1.5:1** — barely visible tint; suitable for background washes
- **3.0:1** — WCAG AA for large text (≥18 pt regular or ≥14 pt bold) and icons
- **4.5:1** — WCAG AA for normal text — required minimum for body copy
- **7.0:1** — WCAG AAA for normal text
- **21.0:1** — maximum possible (pure black on pure white)

"Large text" in WCAG terms means at least 18 pt (24 px) regular or 14 pt (~18.5 px) bold.

---

## Shorthand Conventions

Common abbreviations used in Token Wand configs. Any string is valid.

| Full name         | Shorthand    | Full name  | Shorthand |
| ----------------- | ------------ | ---------- | --------- |
| Background        | `bg`         | Primary    | `pr`      |
| Background/Subtle | `bgs`        | Secondary  | `sc`      |
| Surface           | `sf`         | Neutral    | `nt`      |
| Surface/Raised    | `sfr`        | Error      | `er`      |
| Border            | `bd`         | Success    | `su`      |
| Border/Strong     | `bds`        | Warning    | `wa`      |
| Fill              | `fi`         | Info       | `in`      |
| Fill/Strong       | `fis`        | Brand      | `br`      |
| Text              | `tx`         | Accent     | `ac`      |
| Text/Muted        | `txm`        | Action     | `at`      |
| Text/Strong       | `txs`        | Inverse    | `iv`      |
| Text/Inverse      | `txi`        | On/Primary | `op`      |
| Subtle            | `1` or `sub` | Rest       | `r`       |
| Soft              | `2` or `sft` | Hover      | `h`       |
| Default           | `3` or `def` | Pressed    | `p`       |
| Strong            | `4` or `str` | Selected   | `s`       |
| Bold              | `5` or `bld` | Disabled   | `d`       |
