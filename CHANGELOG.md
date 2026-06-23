# Changelog


## 1.0.18

Initial release of Device Extensions Switcher.

This release includes fixes for Obsidian Community review checks:

* Removed “settings” from settings headings.


Required Obsidian community plugin assets are attached:

main.js
manifest.json
styles.css


## 1.0.17

Initial release of Device Extensions Switcher.

This release includes fixes for Obsidian Community review checks:

* Removed “settings” from settings headings.


Required Obsidian community plugin assets are attached:

main.js
manifest.json
styles.css

## 1.0.16

Release 1.0.16 of Device Extensions Switcher.

This release includes fixes for Obsidian Community review checks:

* Removed “Obsidian” from the plugin description.
* Removed “settings” from settings headings.
* Removed unsafe `innerHTML` usage.
* Replaced direct HTML headings with Obsidian `Setting(...).setHeading()`.
* Updated command IDs and command names to follow Obsidian guidelines.
* Removed deprecated/unneeded build dependency usage.
* Updated the built-in SVG logo.

Required community extension assets are attached:

* `main.js`
* `manifest.json`
* `styles.css`


## 1.0.15

- Renamed the display name to `Device Extensions Switcher`.
- Updated the built-in SVG logo used in the settings header.
- Updated `assets/logo.svg` to match the new logo artwork.
- Replaced unsafe `innerHTML` SVG insertion with DOM-created SVG elements.
- Replaced direct HTML heading elements with Obsidian `Setting(...).setHeading()` headings.
- Removed the deprecated/unneeded `builtin-modules` dev dependency.
- Shortened command IDs so they no longer include the plugin ID.
- Shortened command names so they no longer include the plugin display name.
- Wrapped asynchronous UI callbacks so they do not return Promises where a void callback is expected.
- Removed hardcoded `.obsidian` wording from source strings to avoid configuration-folder warnings.
- Confirmed there is no `innerHTML`/`outerHTML` usage in the current code.


## 1.0.14

- Renamed the display name from `Device Plugin Switcher` to `Device Extensions Switcher` to comply with Obsidian community directory requirements.
- Kept the plugin ID and repository name unchanged: `device-plugin-switcher`.

## 1.0.13

- Embedded the settings header logo directly into `main.js` as inline SVG markup.
- Removed the runtime dependency on `assets/logo.png` for the settings UI.
- Release assets are back to the standard Obsidian files: `main.js`, `manifest.json`, and `styles.css`.

## 1.0.12

- Hid Device Extensions Switcher from its own plugin assignment table.
- The plugin still protects itself internally and cannot be disabled by its own device assignment logic.
- Updated the README safety note to explain that the switcher does not appear in its own table.

## 1.0.11

- Moved the Refresh table action into the Table options settings section.
- Renamed the visible action to Refresh plugin list to better describe what it does.
- Removed the standalone action button area from the settings UI.

## 1.0.10

- Removed the Apply current device state button from the settings UI.
- Removed the Reset from current active plugins button from the settings UI.
- Removed the Copy installed IDs button from the settings UI.
- Kept Refresh table as the only visible action button.

## 1.0.9

- Removed Apply mode, auto-apply, startup delay, and protected plugin ID controls from the settings UI.
- Made safe synced-vault behavior the default: session-only apply, auto-apply on startup, 1500ms delay.
- The plugin now always protects itself by default and does not expose protected plugin IDs in the UI.
- Kept only the plugin assignment table, action buttons, and table sort option visible.

## 1.0.8

- Fixed a settings tab crash caused by reading `this.manifest.dir` from the setting tab instance.
- The logo path now uses `this.plugin.manifest` with a safe `.obsidian/plugins/device-plugin-switcher` fallback.

## 1.0.7

- Switched the settings header logo from inline SVG markup to a PNG asset loaded from the plugin folder.
- Fixed the Current column layout by removing inline-block behavior from table cells.
- Improved checked radio styling so the active option is clearly highlighted in green.

## 1.0.6

- Embedded the plugin header logo as inline SVG markup instead of using a data URI.
- Added a subtle selected-cell background in the desktop plugin table.
- Made desktop table rows slightly more compact.
- Increased table header contrast.
- Added a small hover affordance for radio buttons.

## 1.0.5

- Fixed the desktop table layout regression introduced in 1.0.4.
- Restored correct column alignment so radio buttons stay in their own columns instead of stacking.
- Kept the custom green/gray radio styling while using table-cell layout correctly.

## 1.0.4

- Improved desktop table alignment so radio buttons sit centered under their column headers.
- Replaced browser-default radio styling with a cleaner custom radio design.
- Styled checked radios in green, unchecked radios in gray, and disabled radios in light gray.

## 1.0.3

- Reworked the logo for better readability in the settings header and README.
- Styled the header logo to display cleanly without visual distortion.
- Replaced desktop table `n/a` labels with disabled radio buttons only.
- Simplified disabled select options so unavailable choices stay disabled without extra label text.

## 1.0.2

- Added a flat black-and-white logo to the plugin settings UI and README.
- Added clearer README guidance that the plugin requires synced Obsidian configuration/plugin settings to share the same assignment table across devices.
- Added a settings-page sync prerequisite note.

## 1.0.1

- Added compact mobile settings UI with a mode selector per plugin.
- Added sticky desktop table header for long plugin lists.
- Moved the plugin assignment table above advanced settings.
- Applied plugin assignment changes immediately without requiring an Obsidian restart.

## 1.0.0

- Initial release.
- Added settings table for assigning installed plugins to Both, Desktop only, Mobile only, or Disabled.
- Added protected plugin IDs.
- Added session-only and persistent apply modes.
- Added auto-apply on startup.
