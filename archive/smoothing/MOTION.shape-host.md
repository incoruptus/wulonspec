# Wulon Motion

A small, dependency-free motion pipeline for Wulon interfaces.

It has three layers:

1. **Policy** — whether a moment should move at all.
2. **Tokens** — curves, durations, distances, and springs in `motion.css`.
3. **Runtime** — `motion.js`: WAAPI for timed motion, a spring engine for physical motion, and a hot-swap configuration layer.

The reference bar is Apple's *Designing Fluid Interfaces* (WWDC 2018) plus Emil Kowalski's animation standards: respond on pointer-down, anchor a surface to what opened it, start from the value currently on screen, keep interaction interruptible, and make reduced motion gentler rather than absent.

## The gate

Before writing motion, answer both questions.

| Frequency | Decision |
|---|---|
| 100+ times/day (shortcuts, command palette, core navigation) | No animation. |
| Tens of times/day (hover, frequent toggles) | Near-imperceptible, or nothing. |
| Occasional (menus, dialogs, toasts, settings) | Standard motion. |
| Rare / first-time (onboarding, success, celebration) | The delight budget lives here. |

A valid purpose is one of:

- **Feedback** — the interface heard the press.
- **Spatial consistency** — the surface came from, and returns to, its trigger.
- **State indication** — a change is legible.
- **Preventing a jarring change** — content would otherwise teleport.
- **Explanation** — demonstrating a mechanism, marketing only.
- **Delight** — rare moments only.

If the purpose is "it looks cool" on something seen all day, stop.

## Non-linearity

A `cubic-bezier()` is one non-linear segment. It can be asymmetric, and it can overshoot in `y`, but it cannot carry velocity through an interruption. That is why the layer has three tools:

| Need | Tool |
|---|---|
| Enter, exit, hover, press | Named curve + short duration |
| Physical settle, interruption, momentum, a value that should feel alive | Spring (`response` + `damping`) |
| Choreography with several beats | Keyframes / offsets / stagger |
| A soft wipe or reveal | `clip-path`, not width/height |

The curve `0.66, 0, 0.33, 1` is a symmetric ease-in-out. It is useful for on-screen movement, but it starts slowly — wrong for an entrance the user is waiting on. Use the stronger `ease-out` for entry, and a spring when the user can grab the value.

## Tokens

All values live in `motion.css`. The runtime reads the `--wu-dur-*` and `--wu-ease-*` tokens back, so there is no second table in JavaScript.

### Curves

```css
--wu-ease-out: cubic-bezier(0.23, 1, 0.32, 1);       /* strong UI ease-out */
--wu-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   /* on-screen movement */
--wu-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    /* iOS-like sheet */
--wu-ease-soft: cubic-bezier(0.33, 1, 0.68, 1);
--wu-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* tiny pops only */
--wu-ease-refocus: cubic-bezier(0.4, 0, 0.2, 1);     /* blur → sharp */
--wu-ease-toast: ease;
```

### Durations

| Token | Value | Use |
|---|---|---|
| `--wu-dur-press` | 140ms | Pointer-down scale |
| `--wu-dur-micro` | 160ms | Check, switch, small state |
| `--wu-dur-tooltip` | 150ms | Tooltip |
| `--wu-dur-pop` | 200ms | Menu / popover entrance |
| `--wu-dur-menu-out` | 150ms | Menu exit (faster than entry) |
| `--wu-dur-modal` | 280ms | Dialog entrance |
| `--wu-dur-modal-out` | 180ms | Dialog exit |
| `--wu-dur-toast` | 360ms | Toast entrance |
| `--wu-dur-toast-out` | 220ms | Toast exit |
| `--wu-dur-refocus` | 260ms | Data refocus |
| `--wu-dur-stagger` | 320ms | One staggered item |
| `--wu-dur-stagger-step` | 45ms | Gap between items |
| `--wu-dur-progress` | 300ms | Determinate progress width |
| `--wu-dur-caret` | 80ms | Caret glide |
| `--wu-dur-selection` | 120ms | Selection grow |
| `--wu-dur-selection-out` | 160ms | Selection collapse |
| `--wu-dur-weight` | 160ms | Variable font weight |

UI stays under 300ms; the toast is the deliberate exception at 360ms, where the surface needs a little more time to read as a material.

### Corner shape

Native `corner-shape` is not Figma corner smoothing: a superellipse at the same `border-radius` has a much tighter 45° curvature and changes the apparent radius. The reusable shape host in `squircle.js` supplies fill, outline, focus, and shadow for any closed path. Smoothing is opt-in and off by default: only `data-shape` elements or explicit `WulonShape.mount` calls get a path, so the gallery keeps its native radii unless a component is deliberately opted in. The default builder is `clothoid`, G2 (continuous curvature, vendored from Lisse's MIT path-only build); the Figma `squircle` builder is G1 and is available with `data-shape="squircle"`. Both use `p = (1 + 0.6)R`. If `p > min(width, height) / 2` they do not smooth at all and leave the normal round geometry (the capsule guard). Capsules, the tooltip pseudo-element, and the 2px tab indicators remain native even inside an opted-in component.

### Geometry

```css
--wu-press-scale: calc(1 - 0.03 * var(--wu-motion-distance)); /* 0.97 */
--wu-pop-scale: calc(1 - 0.05 * var(--wu-motion-distance));   /* 0.95 */
--wu-pop-rise: calc(4px * var(--wu-motion-distance));
--wu-toast-rise: calc(14px * var(--wu-motion-distance));
--wu-stagger-rise: calc(8px * var(--wu-motion-distance));
--wu-refocus-blur: calc(3px * var(--wu-motion-blur));
--wu-refocus-rise: calc(2px * var(--wu-motion-distance));
--wu-refocus-scale: calc(1 - 0.015 * var(--wu-motion-distance));
```

### Springs

Apple's designer-facing parameters:

- **Response** — seconds to reach the target; lower is snappier.
- **Damping** — `1.0` is critically damped; `< 1` overshoots.

Defaults:

```js
{ response: 0.4, damping: 1.0 }  // data, counters, most UI
{ response: 0.35, damping: 0.8 } // only when a gesture carried momentum
```

Bounce is not decoration. A menu that merely appeared should not overshoot.

## Profiles

| Profile | Enter | Exit |
|---|---|---|
| Press | `scale(0.97)` on `:active`, 140ms | Return on release, same curve |
| Check | Glyph path draws over 200ms; box presses to 0.92 | Path retracts, same duration |
| Range | Fill and custom thumb ease out over 160ms | — |
| Menu | `scale(0.95)` + opacity + `blur(1.5 → 0)`, 200ms, origin at trigger | `scale(0.97)` + `blur(0 → 1.5)`, 150ms, same origin |
| Dialog | `scale(0.96)` + opacity + `blur(2 → 0)`, 280ms, centered | `scale(0.98)` + `blur(0 → 2)`, 180ms |
| Toast | `translateY(14px)` + opacity + `blur(1.5 → 0)`, 360ms, `ease` | `translateY(10px)` + `blur(0 → 1.5)`, 220ms |
| Refocus | `blur(3px → 0)`, `translateY(2px)`, `scale(0.985)`, 260ms | — |
| Stagger | 320ms items, 45ms apart, 8px rise | — |
| Weight | `font-weight` 160ms on active tab/segment labels | — |
| Caret | `translateX` 80ms | Same, collapse to caret |
| Selection | Anchor edge fixed; leading edge eases per frame (`is-tracking`), keyboard from anchor | Collapse to the new caret, 160ms; opacity fades across the same 160ms |
| Sheet | 1:1 drag, `min -36px`, rubber-banded past the edge | Spring to `0`, or dismiss past 40% / a flick |
| Swipe card | 1:1 drag, `rotate = x/24` capped at 14° | Fly out at 90px or a flick; reset re-enters from the same side |

Menus are origin-aware: `positionMenu()` writes `transform-origin` from the trigger and the chosen side. Dialogs are exempt and stay centered.

The blur is a **focus/defocus** cue, not decoration: overlays resolve from 1.5–2px to sharp on entry, then return to that blur on exit. Intensity scales it; reduced motion drops it entirely.

Press states are physical: the switch thumb stretches 25% toward its travel direction while the track scales to `--wu-press-scale`; the checkbox box reaches 0.92; segmented buttons use the same press scale. `--wu-motion-distance` and the `press` switch remove all three without removing the control's state change.

## Runtime API

```js
// Timed entrance and exit.
const animation = WulonMotion.enter(panel, {
  profile: "menu",              // menu | modal | toast | fade
  origin: { x: "left", y: "top" },
});

WulonMotion.leave(panel, {
  profile: "menuOut",
  onFinish: () => { panel.hidden = true; },
});

// Data refocus.
WulonMotion.refocus(valueEl, { text: "1,284" });
WulonMotion.update(valueEl, "1,284");

// Spring count.
WulonMotion.count(numberEl, 74);

// Stagger.
WulonMotion.stagger(list, { selector: "[data-motion-item]" });

// Gesture tracking: pointer capture, velocity history, rubber-banded bounds.
const controller = WulonMotion.track(handle, {
  axis: "y",
  min: -36,
  max: () => sheet.offsetHeight,
  getPosition: () => sheetY,
  onMove: ({ position, velocity, projected }) => { /* set transform */ },
  onEnd: ({ position, velocity, projected, cancelled }) => { /* settle or dismiss */ },
});

// Convenience transform. `rotate` is px per degree; 24 keeps a 300px
// drag at 12.5°.
WulonMotion.drag(card, {
  axis: "x",
  rotate: 24,
  getPosition: () => cardX,
  onEnd: ({ position, velocity, projected }) => { /* fly out or spring back */ },
});

// Raw physics helpers.
WulonMotion.project(1200);       // px added by momentum at release
WulonMotion.rubberband(80, 300); // damped overshoot for a 300px surface

// Raw spring (response/damping, optional velocity).
WulonMotion.spring({
  from: 0,
  to: 1,
  response: 0.4,
  damping: 1,
  velocity: 0,
  onUpdate(value) {},
  onComplete() {},
});

// Hot configuration.
WulonMotion.configure({
  enabled: true,
  speed: 1.25,        // 0.5–2.0, playback rate
  intensity: 1,       // 0–1.5, distance/blur
  reduced: false,
  effects: { press: true, pop: true, refocus: true, ticker: true, stagger: true, gesture: true, typing: true },
});
```

Every configuration change emits `wulon:motionchange` on `document`. The state is stored in `wulon-spec-motion`.

### Declarative hooks

- `[data-motion-dock]` — the control surface.
- `[data-motion-effect]` — dock effect switches; values `press`, `pop`, `refocus`, `ticker`, `stagger`, `gesture`.
- `[data-sheet-demo]` / `[data-swipe-demo]` — the two gesture demos.
- `[data-caret-field]` — custom caret/selection overlay around a real text input.
- `[data-motion-refocus]` — demo button; value in `data-motion-refocus` is the target selector.
- `[data-motion-refocus-watch]` — refocus automatically when the element's text changes.
- `[data-motion-ticker]`, `[data-motion-ticker-step]`, `[data-motion-ticker-random]` — ticker demo.
- `[data-motion-reveal]` + `[data-motion-item]` — reveal on first intersection.
- `[data-motion-replay]` — re-run a stagger container.
- `[data-i18n-ignore]` — keeps dynamic values out of the translation walker.

## Hot-swap behavior

`motion.js` writes four multipliers on `<html>`:

| Variable | Meaning |
|---|---|
| `--wu-motion-time` | Duration multiplier (`1 / speed`, then ×0.65 when reduced) |
| `--wu-motion-distance` | Scale/rise multiplier (`intensity`, or 0 when reduced/off) |
| `--wu-motion-blur` | Refocus blur multiplier |
| `data-motion` | `full`, `reduced`, or `off` |

The dock in the bottom-left is collapsed by default. Expanding it exposes:

- Motion on/off.
- Speed `0.5×–2×`.
- Intensity `0–150%`.
- Reduce motion (also locked on when the OS asks for it).
- Per-effect switches: press, pop, refocus, ticker, stagger, gesture, typing.
- Reset.

The same effect switches are available through `configure({ effects })`. Turning `pop` off makes menus, dialogs, and toasts instant; turning `refocus` off updates text without the blur.

## Reduced motion

Reduced motion means **fewer and gentler**, not zero:

- Spring movement, blur, scale, and rise collapse to zero.
- Opacity and color transitions remain, at 65% duration.
- Menus/dialogs/toasts fade instead of scaling or sliding.
- The number ticker snaps to its final value.
- The spinner slows; the skeleton stops shimmering.
- The OS preference cannot be overridden from the dock; the checkbox locks.
- Direct manipulation stays 1:1; only the release settle is removed, so a drag snaps to its target instead of carrying momentum.
- The caret and selection snap to their new range rather than gliding.

## Refocus

Data that changes without a bridge reads as a hard cut. Refocus gives the new value one short, legible beat:

```
0%    opacity .55, blur 3px, y 2px, scale .985
45%   opacity .80, blur ~1px, y .8px
100%  opacity 1, blur 0, y 0, scale 1
```

Rules:

- Blur never exceeds 20px; this profile uses 3px.
- It runs once per change, not in a loop.
- It is interruptible: a second change cancels the first and starts from the current value.
- Tabular numerals are required for numeric values so width does not jump.
- The value carries `data-i18n-ignore`; it must not be translated.

## Type and layout

The gallery uses variable faces so weight is a continuous quantity, not a font-file swap:

- Sora VF covers Latin (`wght` 100–800); MiSans VF is the CJK fallback (`wght` 150–700); Geist Mono VF covers code (`wght` 100–900).
- The MiSans file is a subset of the gallery's Chinese copy. Unlisted characters fall through to the system CJK font.
- Active tab and segmented-control labels transition `font-weight` over 160ms. The indicator is not re-measured on a timer; a `ResizeObserver` on the buttons keeps its left and width aligned while the glyphs reflow.
- Text policy: chrome that must stay one line (tab/segmented labels, breadcrumb current, select value) truncates with an ellipsis; descriptions wrap with `text-wrap: pretty` and `overflow-wrap: anywhere`.
- Layout changes from weight are therefore smooth and width-aware, not a keyframed `width` animation.

## Hover states

Hover is pointer-gated (`hover: hover` + `pointer: fine`) and only exists on surfaces the user can actually operate. Non-interactive cards, plain data rows, stat panels, and code blocks get no hover at all. A data row that exposes a secondary action (`data-row-context`) is interactive: it gets hover and a context menu, because right-click is an affordance too.

- Buttons lift 1px and primary/accent surfaces get a slow sheen and a brand halo. The sheen is removed under reduced motion or motion off.
- Navigation grows a 2px brand rail and nudges its icon; menu items nudge their leading icon and warm it.
- Tabs reveal a gray preview underline; the active tab keeps only its brand indicator. Segmented controls show a faint pill on inactive options.
- Switch and checkbox get a soft brand halo; inputs and selects get a 1px graphite edge.
- Rows with `data-row-context` tint and grow a 2px inset brand edge. Right-click, the ContextMenu key, or Shift+F10 opens that row's action menu at the pointer.
- Dialog close rotates its glyph 90°; swatches lift 1px; toast actions warm to brand.
- All lift/rotate/nudge distances use `--wu-motion-distance`. Reduced motion keeps color, border, and halo, but drops the movement and the sheen.

## Gestures and momentum

Direct manipulation stays 1:1; only the release is animated.

- Pointer Events plus `setPointerCapture`; the grab offset and current position are preserved.
- Velocity comes from the last ~100ms of position samples, in px/s.
- Momentum uses Apple's exponential projection, not `v² / 2a`:

```js
project(velocity, 0.998) = (velocity / 1000) * 0.998 / (1 - 0.998)
```

- Bounds use progressive resistance:

```js
rubberband(overshoot, dimension, 0.55) =
  (overshoot * dimension * 0.55) / (dimension + 0.55 * |overshoot|)
```

- Release starts from the value currently on screen, with the release velocity. A reverse flick blends direction through the same spring.
- Sheet: drag down; dismiss at 40% height, a projected endpoint past 110%, or a fast flick. Small drags spring back.
- Swipe card: rotate `x/24` capped at 14°; dismiss at 90px or a flick whose projection clears 90px. Reset re-enters from the side it left.
- `gesture` off disables tracking. Reduced motion keeps tracking but snaps on release.
- Keyboard: the sheet handle closes on ArrowDown; the swipe card dismisses on ArrowLeft/Right and moves focus to its reset button.

## Typing and selection

The real `<input>` stays the source of truth; only the caret and selection are drawn.

- `enhanceCaretFields()` wraps every single-line `.wu-input` (text/search/email/url/tel) at runtime, so the Draft demo, project name, search, path, error, service address, and dialog input all share one behavior. The multiline `textarea` keeps native selection but uses the same brand caret and selection color.
- The native caret is hidden with `caret-color: transparent`; a 2px overlay caret is positioned from `selectionStart`.
- Caret x is measured from the text before the caret with a canvas using the input's computed font, then offset by the input's left padding and `scrollLeft`.
- The selection is one rectangular layer behind the text; native `::selection` is transparent. `selectionStart/End` drive its left, width, and opacity.
- While a range exists the caret is hidden. Typing, deleting, arrowing, clicking, scrolling, and `selectionchange` all resync.
- A pointer drag pins the anchor edge and eases only the leading edge with a short per-frame filter. The anchor follows `scrollLeft` immediately and the leading edge is shifted with it, so the right/left edge cannot lengthen or shorten while reversing.
- Keyboard/programmatic ranges use the same anchor model with a gentler filter: `selectionEnd` for backward, `selectionStart` for forward; the pre-range caret is only the fallback when `selectionDirection` is `none`.
- The caret glides at 80ms; keyboard selection grows at 120ms. On deselect the rectangle collapses toward the clicked caret over 160ms while fading across the same 160ms, so the highlight fades early instead of vanishing mid-slide.
- The caret starts blinking after 400ms of inactivity; typing, arrowing, clicking, or selecting resets it.
- `typing` off, motion off, or reduced motion adds `is-static`, so the caret and selection follow exactly without interpolation and the caret stays solid.
- The input remains editable, selectable, copyable, and IME-compatible; the overlay is `aria-hidden`.

## Applied components

| Component | Motion |
|---|---|
| Button | `scale(0.97)` on press, 140ms strong ease-out |
| Checkbox | Glyph path draws over 200ms; box presses to 0.92 |
| Switch | Thumb slides 16px on spring; presses into a 4px width stretch toward travel |
| Range | Fill and custom thumb interpolate over 160ms |
| Menu | Origin-aware scale + focus blur, WAAPI |
| Dialog | Backdrop fade + dialog scale + focus blur, WAAPI |
| Toast | Rise/fade + focus blur, same path out, WAAPI |
| Number ticker | Spring value, tabular figures |
| Stagger | 320ms + 45ms step, opacity/translate |
| Navigation | 2px brand rail grows on current/hover; icon nudges 2px and warms |
| Tabs | Shared underline follows real width and 160ms font-weight interpolation |
| Segmented | Shared pill follows real width and 160ms font-weight interpolation |
| Table rows | No hover by default; `data-row-context` rows tint and open a context menu |
| Text field | Caret 80ms glide; selection 120ms grow, 160ms collapse; native semantics preserved |
| Bottom sheet | 1:1 vertical drag, rubber-banded, spring settle or dismiss |
| Swipe card | 1:1 horizontal drag + rotation, momentum fly-out, side-aware reset |
| Motion dock | Hot configuration, persisted |

## Performance rules

- Animate `transform`, `opacity`, and `clip-path`; short `filter` only.
- Never `transition: all`.
- Never enter from `scale(0)`; start at `0.95–0.97` with opacity.
- Use WAAPI for programmatic motion; CSS for predetermined motion.
- Do not drive child transforms through a parent CSS variable.
- Keep animated blur under 20px.
- Do not animate `width`, `height`, `top`, or `left`; the progress bar is the only width exception and is functional.

## Debugging

- Set speed to `0.5×` in the dock to watch a transition at half speed.
- Use DevTools → Animations to step frame by frame and inspect timing drift.
- Test menus and dialogs with keyboard only; focus return is part of the motion.
- Test gestures on a real device.
- Look again the next day; feel is not settled in one sitting.

## Not yet

- Multi-touch pinch/rotate and nested scroll arbitration.
- Shared-element / view transitions.
- A motion timeline editor.

The gesture layer covers single-pointer drag, velocity handoff, projection, and rubber-banding. The remaining items belong on the same runtime when a real surface needs them.

## References

- Apple, *Designing Fluid Interfaces* (WWDC 2018): response, direct manipulation, interruptibility, velocity handoff, momentum, spatial consistency, rubber-banding.
- Apple, *Animate with springs* (WWDC 2023): springs as the default for physical, interruptible motion.
- Emil Kowalski's animation skills: `animate`, `apple-design`, `review-animations`, `find-animation-opportunities` (vendored under `Cyno-Skills/emil-skills`).
