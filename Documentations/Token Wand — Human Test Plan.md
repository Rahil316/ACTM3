Token Wand — Human Test Plan
Plugin: Token Wand (Figma)
Branch: tw-React
How to run: Open Figma → Plugins → Development → Token Wand

1. Startup & Initial Load
#	Test	Steps	Expected Outcome
1.1	Plugin opens without error	Launch plugin from Figma menu	UI loads, no blank screen, no console errors
1.2	Default state is correct	Open plugin fresh (no prior save)	Quick Start overlay appears automatically
1.3	Saved state restores	Configure a project, close plugin, reopen	All fields (name, colors, roles, themes) are restored exactly
1.4	Plugin resizes correctly	Drag bottom-right resize handle	UI reflows smoothly, no layout breaks at small or large sizes
1.5	UI scale setting persists	Change UI scale in Settings → Plugin tab, close and reopen	Same scale is restored on next open
2. Quick Start Overlay
#	Test	Steps	Expected Outcome
2.1	Overlay appears on fresh open	Open plugin with no saved state	Quick Start modal is visible
2.2	Blank Start	Click "Blank Start"	Overlay closes, all screens empty, project name is blank
2.3	Load a preset	Click any preset card (e.g. "Material")	Overlay closes, colors/roles/themes populate from that preset
2.4	Preset badge displays	Inspect preset cards	Each card shows its badge label (e.g. "TW") correctly
2.5	Cannot dismiss without choice	Click backdrop or press Escape	Overlay stays open — no accidental dismissal on fresh state
3. Colors Screen
#	Test	Steps	Expected Outcome
3.1	Add a color	Click "+" / Add color button	New color card appears with a default name and hex
3.2	Edit color name	Click name field on a card, type new name	Name updates in real time
3.3	Edit hex value	Click the color swatch or hex field, type a valid hex	Swatch updates to new color
3.4	Invalid hex rejected	Type an invalid hex (e.g. "ZZZZZZ")	Field shows error state or reverts; no crash
3.5	Delete a color	Click the delete/trash icon on a card	Card is removed; roles that referenced it are not broken
3.6	Reorder colors via drag	Drag one card above another	Order updates immediately; persists after navigating away and back
3.7	Minimum one color	Delete all but one color, try to delete last	Last color cannot be deleted, or a warning is shown
3.8	Duplicate color name	Create two colors with the same name	Validation warning is shown
4. Roles Screen
#	Test	Steps	Expected Outcome
4.1	Add a role	Click "+" / Add role button	New role card appears
4.2	Edit role name	Click the name field, type new name	Name updates
4.3	Delete a role	Click delete on a role card	Role is removed
4.4	Reorder roles via drag	Drag one role above another	Order updates and persists
4.5	Assign local bg to role	Expand a role and set a local background (hex, theme, token-static, token-dynamic, color)	Value saves, bg kind displays correctly
4.6	Role-specific variations (on)	Enable "Role-specific Variations" in Settings → Tokens, go back to a role	Per-role variation list is visible on each role card
4.7	Role-specific variations (off)	Disable "Role-specific Variations"	Per-role variation controls disappear; global list used
4.8	Variation target	Set a target value on a variation under a role	Value saves and displays correctly
5. Project Screen
#	Test	Steps	Expected Outcome
5.1	Edit project name	Click the name field and type a new name	Name updates; reflects in exported filenames
5.2	Edit project description	Click description field, type text	Saves correctly
5.3	Save a version	Click "Save Version", enter a name	Version appears in the versions list with a timestamp
5.4	Restore a version	Click restore on any version in the list	All fields (colors, roles, themes, settings) revert to that snapshot
5.5	Delete a version	Click delete on a version	Version removed from list; current state unchanged
5.6	Export .wand file	Click "Export .wand"	A .wand JSON file downloads; file is valid JSON with all project fields
5.7	Import .wand file	Click "Import .wand", select the exported file	Project state replaces current state exactly
5.8	Import invalid file	Import a file that is not a valid .wand (e.g. plain text)	Error banner shown; state unchanged
5.9	Themes list	Add a theme in the themes area, set a name and background hex	Theme appears in list; background hex is valid
5.10	Delete a theme	Delete a theme from the list	Theme removed; no orphan references crash the plugin
6. Settings Overlay — Tokens Tab
#	Test	Steps	Expected Outcome
6.1	Open settings	Click the Settings icon	Full-screen overlay opens with "Tokens" tab active
6.2	Cancel reverts	Change any setting, click Cancel	All values return to what they were before opening
6.3	Done saves	Change any setting, click Done	New values persist
6.4	Plugin mode: Scale	Set mode to "Scale"	Algorithm selector visible; Solver selector hidden
6.5	Plugin mode: Direct	Set mode to "Direct"	Algorithm selector hidden; Solver controls appear
6.6	Direct + Global Algo on	Direct mode, enable "Use Global Algorithm"	Solver selector shown (single solver)
6.7	Direct + Global Algo off	Direct mode, disable "Use Global Algorithm"	Solver scope (By Color / By Role) shown instead
6.8	Scale length	Change Steps value in Palette card	Number saves; must be a positive integer
6.9	Token name format drag	Drag the name segment pills into a new order	Preview string below updates to reflect new order
6.10	Shorthand toggles	Toggle each shorthand option on/off	Token name preview updates accordingly
6.11	Variable descriptions toggle	Toggle on, run plugin, inspect Figma variables	Description field is populated on variables
6.12	Palettes collection toggle	Toggle off	Collection name input hides; no scale collection created on run
6.13	Source Colors toggle	Toggle on	Source collection name input appears
6.14	Alpha Tints toggle + values	Toggle on, enter comma-separated values (e.g. 10,20,50)	Values save; alpha tint variables created on next run
6.15	Link tokens to color scale	Toggle on/off	Setting persists; affects variable mode binding on run
7. Settings Overlay — Plugin Tab
#	Test	Steps	Expected Outcome
7.1	Scale step names	Add a new scale step name with shorthand	Appears in the list; used in token naming
7.2	Delete a scale step	Delete one from the list	Removed immediately
7.3	Reorder scale steps	Drag steps into a new order	Order persists
7.4	UI theme selector	Switch between Figma / Light / Dark	Plugin UI theme changes immediately
7.5	UI scale selector	Switch between scale options	Plugin scales up/down without layout breaks
8. Run Dialog
#	Test	Steps	Expected Outcome
8.1	Open run dialog	Click the main Run/Apply button	Run Dialog overlay appears
8.2	Scope: All	Select "All" scope and run	All variable collections (scale, tokens, source) are created/updated in Figma
8.3	Scope: Groups only	Select "Groups" and run	Only scale (palette) collection updated
8.4	Scope: Roles only	Select "Roles" and run	Only token collection updated
8.5	Rename summary	After a run that includes renames, reopen Run Dialog	Renamed tokens are listed with from→to in the rename summary section
8.6	Conflict resolution	When a rename conflict exists, options to "Keep" or "Revert" appear	Selecting each and running applies the chosen behavior to Figma variables
8.7	Run with no colors	Attempt to run with zero colors defined	Validation error shown; run blocked
8.8	Run with no themes	Attempt to run with zero themes	Validation error shown or graceful fallback
8.9	Cancel closes dialog	Click Cancel in the Run Dialog	Dialog closes; no changes made to Figma
9. Preview Screen
#	Test	Steps	Expected Outcome
9.1	Open preview	Click Preview button	Preview overlay opens
9.2	Theme tabs	Multiple themes defined — tab per theme shown	Clicking each tab shows that theme's tokens
9.3	Token grid renders	With a valid config	Scale step tiles show hex swatches and contrast ratings (Aa badge)
9.4	Copy hex on click	Click a color swatch in the grid	Hex value is copied to clipboard; toast confirmation shown
9.5	Copy token name on click	Click the token label	Token name copied to clipboard; toast shown
9.6	Contrast rating display	Inspect a tile with contrast data	Correct rating shown (e.g. AA, AAA, Fail) based on the contrast ratio
9.7	Group by Color / Role	Toggle the Group By selector	Grid regroups accordingly
9.8	Preview with engine error	Introduce an invalid config (delete all colors mid-session)	Error state shown inside preview; no crash
9.9	Close preview	Click Close	Returns to main UI
10. Export Sheet
#	Test	Steps	Expected Outcome
10.1	Open export sheet	Click Export button	Export Sheet overlay opens
10.2	Format selector	All 11 format options are visible	CSS, SCSS, DTCG, Android, Swift, Tailwind, Style Dictionary, React Native, and others listed
10.3	Export CSS	Select CSS, click Export/Download	File downloads; contains correctly named CSS custom properties
10.4	Export SCSS	Select SCSS	File downloads; valid SCSS variable syntax
10.5	Export DTCG	Select DTCG	Valid JSON with $value / $type structure
10.6	Export Android	Select Android	Valid XML resource file
10.7	Export Swift	Select Swift	Valid Swift enum/struct token file
10.8	Export Tailwind	Select Tailwind	Valid tailwind.config.js token block
10.9	Export Style Dictionary	Select Style Dictionary	Valid .json structure for Style Dictionary consumption
10.10	Export React Native	Select React Native	Valid JS/TS object with token values
10.11	Token names match Figma	Run plugin then export CSS	CSS variable names match the Figma variable names exactly
10.12	Shorthand reflected in export	Turn on shorthand options, export	Exported names use shorthands
11. Theme Shop Overlay
#	Test	Steps	Expected Outcome
11.1	Open theme shop	Click Theme Shop button	Overlay opens with preset cards visible
11.2	All 9 presets visible	Scroll through the overlay	All preset cards render with name, description, and color swatches
11.3	Load a preset	Click a preset card	Confirmation prompt appears ("This will overwrite your current project")
11.4	Confirm load	Click Confirm on the prompt	Project state replaced with preset; overlay closes
11.5	Cancel load	Click Cancel on the confirm prompt	Nothing changes; overlay stays open
11.6	Color swatches preview	Inspect swatch row on each card	Colors are correct and representative of the preset
12. Notifications (Toast & Banner)
#	Test	Steps	Expected Outcome
12.1	Success toast appears	Complete a successful run	Green success toast appears briefly then auto-dismisses
12.2	Error banner appears	Trigger a known error (invalid run)	Red error banner appears at top of UI
12.3	Banner dismiss	Click X on a banner	Banner slides out and disappears
12.4	Multiple toasts	Trigger multiple toasts rapidly	Stack shows max 5; oldest drops off
12.5	Warning banner	Trigger a warning condition	Yellow/orange warning banner shown with correct message
13. Edge Cases & Stability
#	Test	Steps	Expected Outcome
13.1	Very long project name	Enter 200+ characters in the project name field	UI doesn't break; text truncates or scrolls gracefully
13.2	20+ colors	Add 20 color cards	Colors screen scrolls correctly; performance acceptable
13.3	20+ roles	Add 20 role cards	Roles screen scrolls; no visual overflow issues
13.4	Rapid clicks on Run	Click Run button multiple times quickly	Only one run executes; no duplicate variable sets created
13.5	Switch screens mid-edit	Start editing a color name, navigate to Roles tab	Name input is saved or gracefully abandoned; no crash
13.6	Reopen settings rapidly	Open and close Settings overlay multiple times quickly	State is never corrupted; cancel/done always works correctly
13.7	No internet (offline)	Run plugin with Figma in offline mode	Plugin works; no network dependency failures
13.8	Run on empty Figma file	Run plugin on a blank new Figma file	Variables created correctly from scratch
13.9	Re-run after Figma rename	Rename a Figma variable manually, then re-run	Plugin detects the rename and handles it (rename summary shown)
Total tests: 96
Each test should be logged as Pass / Fail / Blocked with a note on the actual outcome if it differs from expected.