# Wulon UI

A shared color, type, motion, and component layer for Caddy Wulon apps.

The surfaces, neutrals, five tea palettes, type scale, radii, shadows, focus ring, buttons, form states, and motion profiles come from interfaces already in use. This folder turns them into CSS and markup that another product can pick up without redesigning its controls.

## Open

```powershell
cd "D:\Creation\Caddy Wulon\WulonSpec"
python -m http.server 4173 --bind 127.0.0.1
```

Then open <http://127.0.0.1:4173>.

Or double-click `start.bat`. It checks for an existing preview, starts the Python server if needed, and opens the page in the default browser.

The top-right controls switch between light and dark mode, the five tea palettes, and the UI language. The motion dock at the bottom left is collapsed by default; open it to toggle motion, change speed or intensity, and test reduced motion. Interface copy supports Simplified Chinese and English. Text inside the component examples stays English so the samples read the same in every locale.

## Files

```text
WulonSpec/
├─ index.html      Component gallery and usage notes
├─ start.bat       Double-click preview launcher
├─ wulon.css       Components: buttons, forms, cards, navigation, feedback, overlays
├─ motion.css      Motion tokens, component transitions, dock, and gallery
├─ tokens.css      Color tokens, kept in sync with the host app's token block
├─ wulon.js        Theme, palette, tabs, dropdown menus, dialog, and copy-to-clipboard
├─ motion.js       Motion runtime: WAAPI, springs, refocus, ticker, stagger, hot config
├─ motion-lab.css  Scoped Motion Lab controls and specimen stage
├─ motion-lab.js   Motion Lab: local CSS variables + real spring/gesture previews
├─ i18n.js         Locale dictionaries, attribute translation, dynamic DOM refresh
├─ MOTION.md       Motion policy, token tables, profiles, and API
├─ archive/        Folded-away experiments; not loaded by index.html
├─ fonts/          Sora VF, full MiSans VF, Geist Mono VF
```

## Adding it to another app

Minimal setup:

```html
<html class="dark" data-palette="green">
  <head>
    <link rel="stylesheet" href="./wulon.css" />
  </head>
  <body>
    <button class="wu-btn wu-btn--accent">Start sync</button>
  </body>
</html>
```

`wulon.css` already imports `tokens.css`, so one stylesheet is enough. Copy `fonts/` alongside it.

Motion is an optional second layer. Load `motion.css` after `wulon.css` and `motion.js` after `wulon.js`:

```html
<link rel="stylesheet" href="./wulon.css" />
<link rel="stylesheet" href="./motion.css" />
<script src="./wulon.js" defer></script>
<script src="./motion.js" defer></script>
```

Without `motion.css` the components keep the base transitions defined in `wulon.css`; without `motion.js` the dock and spring/refocus APIs do nothing. The CSS layer degrades safely on its own.

For a Tailwind app, map the `--ds-*` variables into the Tailwind theme. The `.wu-*` classes can stay, or the same values can be expressed as utility classes. The values matter more than the class names.

## Tea palettes

| `data-palette` | Tea | Character |
|---|---|---|
| `green` | West Lake Green | Default; a fresh, natural brand green |
| `white` | Silver Needle | Pure black and white; the most restrained option |
| `red` | Keemun | Warm and wine-red; useful for expressive pages |
| `yellow` | Junshan | Malt gold; soft without losing strength |
| `puer` | Yunnan Puer | Deep brown; comfortable for long sessions |

A tea palette changes the brand and neutral base. Success, warning, danger, and info keep their meaning, so a red palette never swallows a danger state.

## Tokens

The most-used layer:

```css
--ds-background-100    /* cards, overlays, inputs */
--ds-background-200    /* page background */
--ds-gray-100…1000     /* from the lightest fill to the darkest text */
--ds-brand-100…700     /* tea brand layer */
--ds-brand-ink         /* text and icons on a brand fill */
--ds-focus-color       /* keyboard focus */
--ds-blue-700          /* info */
--ds-green-700         /* success */
--ds-amber-700         /* warning */
--ds-red-700           /* danger */
```

Shadows and fonts live in the `:root` block of `wulon.css`:

```css
--wu-shadow-xs / md / menu / modal
--wu-shadow-border
--wu-focus
--wu-font-sans / --wu-font-mono
```

Default radii keep the original round geometry and the original tokens, so 5 / 6 / 8 / 12 / 16 and the 999px capsules render exactly as before. Corner smoothing is not part of the live library; the archived experiment and its lessons are in [`archive/smoothing`](archive/smoothing/LESSONS.md).

## Type

- **Sora VF** carries Latin, `wght` 100–800. **MiSans VF** carries everything else, `wght` 150–700; **Geist Mono VF** carries code and numbers. The non-mono stack is Sora → MiSans → system CJK, so Chinese added in any component stays in one family at a consistent weight.
- The MiSans runtime file is the **full** VF (29,571 glyphs), not a gallery subset. A subset cannot guarantee arbitrary Chinese: missing glyphs fall back per character and mix CJK faces inside one word.
- Tab and segmented-control active labels interpolate `font-weight` over 160ms; Latin uses Sora's variable axis, while CJK uses the nearest real weight of the system family.
- Body copy and descriptions wrap with `text-wrap: pretty`; single-line chrome (tab/segmented labels, breadcrumb current, select value) truncates with an ellipsis. See `fonts/README.md` for sources and the MiSans subset command.

## Components

- Buttons: seven variants, four sizes, loading, disabled, square and circular icon buttons
- Forms: input, textarea, custom select/listbox, search, checkbox, switch, custom-thumb range, segmented control
- Badges: gray, blue, green, amber, red, violet, teal, solid, accent
- Cards: default, wash, flat; stat blocks; empty state
- Callouts: info, warning, danger, success; heading, explanation, and action
- Navigation: sidebar nav with hover rail + icon nudge, tabs, breadcrumbs, dropdown menu, segmented control
- Feedback: toast, tooltip, progress, skeleton, spinner
- Data: table, key-value rows, code block, keyboard hints
- Overlays: backdrop, dialog, close button, focus return
- Motion: press scale, origin-aware pop, refocus, number ticker, stagger, spring engine, drag sheet, swipe card, caret and selection

## Shell

- Desktop: a 236px sticky sidebar holds brand, grouped navigation, and a pinned Appearance / Palette / Language block at the bottom. The sidebar itself does not scroll; only `.wu-sidebar-nav` scrolls when the nav is taller than the viewport. The block has no "Settings" heading. The main topbar is just the breadcrumb.
- Mobile (≤960px): the sidebar becomes an off-canvas drawer with the same pinned bottom controls, a scrim, inert background, Escape/scrim close, and focus return. Only the nav area scrolls. The topbar becomes a sticky compact bar with a menu button and the current section title.
- The drawer uses `left` rather than `transform` so the fixed-position palette/language menus are not clipped by the sidebar's overflow.
- `data-nav-open` on `.wu-shell` is the single drawer state; `data-nav-toggle` and `data-nav-close` drive it.

## Dropdown menu

One wrapper, one toggle, one popup:

```html
<div class="wu-menu-wrap" data-menu>
  <button class="wu-btn wu-btn--secondary" type="button"
          data-menu-toggle aria-haspopup="menu" aria-expanded="false">
    Project actions
  </button>
  <div class="wu-menu" role="menu" hidden>
    <div class="wu-menu-label">Atlas</div>
    <button class="wu-menu-item" type="button" role="menuitem">Open folder</button>
    <button class="wu-menu-item" type="button" role="menuitem" disabled>Archive project</button>
    <div class="wu-menu-sep"></div>
    <button class="wu-menu-item wu-menu-item--danger" type="button" role="menuitem">Remove</button>
  </div>
</div>
```

`wulon.js` adds the ids, `aria-controls`, `aria-labelledby`, roving `tabindex`, and the default item role. It also handles ArrowUp/Down, Home/End, first-letter typeahead, Enter/Space, Escape with focus return to the trigger, Tab, outside click, and scroll or resize.

The popup is fixed to the viewport and positioned from the trigger, so an `overflow: hidden` table wrapper cannot clip it. It flips above the trigger when there is room above and scrolls internally when neither side fits.

With the motion layer loaded, the popup scales and fades from the trigger origin and leaves along the same path; with motion off, the same code path closes immediately.

Checkable items use `role="menuitemradio"` or `role="menuitemcheckbox"` with `aria-checked`, and the check glyph gets `.wu-menu-check`. The gallery uses this one component for the tea palette, the language menu, project actions, and every table row. Menus added after load only need `window.WulonMenu.init(root)`.

Selecting an item closes the menu, returns focus to the trigger, and dispatches `wu:menuselect` on the item. `detail.value` reads `data-value`, `data-palette-value`, or `data-locale-value`, so page code can delegate instead of binding every item.

## Select

The form select is a listbox on the same popup surface as the menu, so it inherits the shadow, radius, motion, keyboard, and focus-return rules. No native `<select>` remains in the gallery.

```html
<span class="wu-label" id="version-label">Runtime version</span>
<div class="wu-select-wrap wu-menu-wrap wu-select-menu-wrap"
     data-menu data-menu-kind="listbox" data-menu-width="trigger" data-select>
  <button class="wu-select wu-select--button" type="button" role="combobox"
          data-menu-toggle aria-haspopup="listbox" aria-expanded="false"
          aria-labelledby="version-label version-value">
    <span id="version-value" data-select-value>v2.4</span>
  </button>
  <div class="wu-menu wu-menu--select" role="listbox" aria-labelledby="version-label" hidden>
    <button class="wu-menu-item wu-select-option" type="button" role="option"
            data-value="v2.4" data-label="v2.4" aria-selected="true">
      <span>v2.4</span>
      <svg class="wu-icon wu-menu-check" aria-hidden="true"><use href="#i-check"/></svg>
    </button>
  </div>
  <input type="hidden" name="version" value="v2.4" data-select-input />
</div>
```

`initSelects()` syncs the visible value, `aria-selected`, and the optional hidden input. `data-menu-width="trigger"` makes the popup as wide as the field. Keyboard uses the listbox path: ArrowUp/Down, Home/End, typeahead, Enter/Space, Escape with focus back to the trigger.

## Motion

Motion is a second, optional layer. `motion.css` holds the tokens and component transitions; `motion.js` is a dependency-free runtime built on WAAPI plus a spring integrator.

- Curves, durations, and geometry are `--wu-*` tokens. `motion.js` reads the raw timing tokens back, so there is no second table in JavaScript.
- Profiles: press, check, menu, dialog, toast, refocus, stagger, spring, sheet, swipe card, caret, selection, weight.
- API: `WulonMotion.enter`, `leave`, `refocus`, `update`, `count`, `stagger`, `spring`, `track`, `drag`, `project`, `rubberband`, `configure`.
- Gestures: 1:1 pointer tracking with capture, velocity history, release-velocity handoff, Apple momentum projection, and rubber-banded bounds. The gallery ships a draggable bottom sheet and a swipe card.
- Typing: every single-line `.wu-input` (project name, search, path, error, service address, dialog, and the Draft demo) is enhanced at runtime with the same canvas-measured caret and anchored selection. A real input remains the source of truth; the caret glides at 80ms. Pointer selection pins its anchor and eases the leading edge per frame; keyboard selection eases from its anchor; deselect collapses toward the clicked caret over 160ms while fading. Native selection is transparent; the overlay is aria-hidden. The multiline `textarea` keeps native selection but shares the brand caret/selection color.
- Hover: pointer-gated and only on interactive surfaces. Buttons lift with a slow primary sheen; nav/rail, tab preview underline, segmented pill, switch/check halo, input/select edge, dialog-close rotation, and swatch lift share the motion-distance switch. Cards, stat panels, and code blocks intentionally have no hover; table rows only hover when they expose a context menu or drag affordance.
- Focus: menus, dialogs, and toasts resolve from 1.5–2px blur to sharp on entry and return to blur on exit. Press: switch thumb stretches 25% toward its travel, checkbox box presses to 0.92, segmented buttons use the press scale.
- Hot config: on/off, speed 0.5–2×, intensity 0–150%, reduced motion, and per-effect switches (including `gesture` and `typing`).
- Reduced motion removes movement and blur but keeps short fades; direct gestures stay 1:1 and snap on release, and the caret/selection snap. The OS preference locks the dock checkbox.
- Menus are origin-aware and use the same path to enter and leave. Numbers use tabular figures and a spring, not a tween.
- Tabs and segmented controls share an indicator that follows real widths and 160ms variable-font weight interpolation; existing inputs, buttons, and navigation use the same micro token.
- The dock at the bottom left persists its state to `wulon-spec-motion`.
- Motion Lab is a scoped tuning surface in the Motion section: duration, spring response/damping, gesture threshold, and indicator speed drive four real specimens (Tabs, Segmented, Sheet, Card). It writes only its own `--lab-*` variables and spring arguments; no library token is changed. Lab chrome follows the page locale; the specimen bodies stay English.

Read [MOTION.md](MOTION.md) for the frequency/purpose gate, exact token tables, profiles, API, and performance rules.

## Badge and checkbox metrics

The three badge sizes use fixed heights: 20 / 24 / 32 px. Content is centered by flexbox, so a row of `sm`, `md`, and `lg` badges shares one optical line, and a badge in a card header sits on the title's center line instead of wrapping below it. Standalone status labels (`.wu-live`, `.wu-warn`, `.wu-danger`) are inline-flex rows with a 7px gap; an inline dot sits on the text baseline and reads high.

The checkbox box is 18px. Its glyph is 15px with `stroke-width: 2.6`; the shared 1.8 icon stroke renders below one pixel at that size. The check uses its own `#i-check-box` symbol so the toolbar check icon keeps the lighter stroke. That path carries `pathLength="1"` and draws via `stroke-dashoffset` over 200ms; the box presses to 0.92.

## Localization

`i18n.js` owns every piece of visible chrome in the gallery. English is the source key; each entry only carries the locales whose text differs:

```js
const UI = {
  Overview: { zh: "概览" },
  "Component Library": { zh: "组件库" },
};
```

The walker replaces matching text nodes and translates `aria-label`, `title`, `placeholder`, `alt`, and `data-tip` values. The lookup is bidirectional: a label rewritten by JS after a locale change (the palette name or a menu label, for example) still returns to English without keeping a snapshot of the original DOM. A `MutationObserver` translates nodes inserted later.

Localization rules:

1. Keep one English source string per concept. Two English entries with the same Chinese text make the reverse lookup ambiguous.
2. Prefer the source string as the key. Add a locale only when its text differs from English.
3. To add a language, add a record to `LOCALES`, give it an `htmlLang` and a `title`, and add that locale key to each `UI` entry that needs it (`zh` is the key for `zh-CN`). Missing entries fall back to English.
4. Mark markup that must never be translated (brand names, code samples, sample data) with `data-i18n-ignore`.
5. Call `window.WulonI18n.refresh()` after replacing a large DOM subtree; new nodes are also picked up automatically.

The active locale is stored in `wulon-spec-locale`. `?lang=`, `?theme=`, and `?palette=` take precedence on load and are then stored like a manual choice.

The language menu itself is built from `WulonI18n.locales`, so adding a locale does not require a second copy of the option markup.

## Rules

1. Keep one primary action per screen. Do not let `default` and `accent` compete.
2. Use status colors only for status. Red belongs to danger and failure.
3. Limit text to three levels: `gray-1000` for body, `gray-800` for explanation, `gray-700` for metadata.
4. Give every conclusion a next step. A callout should not stop at the problem.
5. The checked switch thumb follows `--ds-brand-ink`, so it stays readable on both light and dark tracks.
6. Motion must pass the gate in `MOTION.md`: no animation on keyboard or 100+/day actions, and reduced motion ships with the effect.

## Switch contrast

The checked track uses the brand color, and its lightness changes with the theme. A fixed white thumb disappears when that track is light. The thumb now reads the same contrast color used for text on a brand fill:

```css
.wu-switch[aria-checked="true"]::after {
  background: var(--ds-switch-thumb-on); /* var(--ds-brand-ink) */
}
```

In light mode the checked track is dark and the thumb is light. In dark mode the checked track is light and the thumb is dark. The unchecked state keeps the white thumb on the `gray-400` track. No component inspects the active palette.

The host app uses the same token, so the five tea palettes and both color modes share one rule.

## Syncing tokens

The token block in `tokens.css` mirrors the host app's design tokens. When the host app changes a token, copy that block again or update the matching variable by hand.

The component layer is not tied to a build system. Values, states, and visual rules stay the same across projects; the switch fix uses the same token names on both sides.
