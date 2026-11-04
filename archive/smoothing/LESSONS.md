# Corner smoothing — archived experiment

Status: **not loaded by the live gallery**. The live `index.html` has no
`squircle.js` or `vendor/lisse` script. The files in this directory are a
snapshot for future, per-component experiments.

Restored baseline: the `wulon-pre-corner-scale-20261103-205746` snapshot,
which is the last version before corner smoothing was introduced. The live
`wulon.js`, `motion.js`, `i18n.js`, and `tokens.css` were already identical to
that baseline; only the five files listed below had diverged.

## Snapshot

| File | What it is |
| --- | --- |
| `squircle.js` | generic shape host: fill, outline, focus, shadow, clothoid/squircle/sheet builders |
| `wulon.shape-host.css` | shape-host-era component CSS, including the global host pass |
| `motion.shape-host.css` | shape-host-era motion CSS, including the hosted sheet |
| `index.shape-host.html` | page shell that loaded the host |
| `vendor/lisse/` | MIT path-only Lisse 0.7.3 build, used for clothoid paths |
| `README.shape-host.md` / `MOTION.shape-host.md` | the docs written during the experiment |

## What was attempted

- A reusable host that clips only a fill layer, and paints border and focus
  rings as separate SVG paths, so content and focus are never clipped.
- Figma-style corner smoothing with the original `border-radius` tokens.
- Two curves: Figma 60% squircle (G1) and clothoid (G2), both with
  `p = (1 + 0.6) * R`.
- A hard capsule guard: if `p > min(width, height) / 2`, return no path and
  keep the native radius.
- Per-corner support for the sheet, via Lisse's per-corner path generation.
- Migration of buttons, cards, panels, segments, checkbox fills, inputs,
  textareas, selects, menus, menu items, dialogs, toasts, callouts, kbd,
  nav items, stats, tables, code blocks, swatches, and the sheet.

The geometry itself was not fake: the fill was a real path, and the border,
focus ring, and glow were real paths. The failure was integration and rollout.

## What went wrong

### 1. Global rollout instead of per-component proof

The host was auto-mounted on every matching `.wu-*` component at once. That
turned a geometry experiment into a library-wide rewrite. When one assumption
was wrong, it broke many components and several animations together. There was
no isolation between "this shape builder works" and "this component still
behaves like the library".

### 2. Host transition owned the component transition

The host added `transition: filter ...` to every host. That declaration
overrode the component's own transition list (buttons, segmented indicator,
checkbox, nav, menu items), so press, hover, selection, and indicator motion
stopped behaving as designed. A host may add a property to a component's
transition list; it must not replace the list.

### 3. Path measured transformed geometry

`getBoundingClientRect()` includes `transform: scale()` from press and pop
animations. The path was recalculated from the scaled rect during the
animation, so the fill and outline were scaled twice or changed shape
mid-flight. Layout size must come from computed width/height (or
`offsetWidth`/`offsetHeight`), never from the transformed rect.

### 4. Textarea is a replaced element

`<textarea>` cannot render child elements. Appending `span.wu-shape-fill` and
`svg.wu-shape-outline` inside it produced no layers. Because the host also
cleared the textarea background and box-shadow, the result was a borderless,
transparent textarea. A wrapper (`.wu-textarea-field`) is required; the
textarea itself must stay transparent and retain its native caret and
selection.

### 5. Shape shadow and motion blur share `filter`

Menus, dialogs, and toasts animate `filter: blur()` on enter/leave. The host
also used `filter: drop-shadow()` for the shape shadow. During the animation
the motion filter replaced the shape shadow, so the shadow disappeared and
popped back at the end. A filter cannot be shared by two independent systems
without composition. A separate shadow carrier is needed, or the motion and
shadow systems must be designed together.

`filter` also creates a containing block for fixed descendants. A dialog that
hosts a fixed-position menu can therefore break the menu's coordinates.

### 6. Overflow clips what the host thinks is outside

A menu is a scroll container (`overflow-y: auto`). A shadow layer or effect
placed inside it is clipped. The host used a filter on the menu itself, which
can survive its own overflow, but that is not a general solution; Lisse uses
an external anchor/overlay for this reason.

### 7. Component state was moved into the fill

Hover, selected, and current backgrounds were moved to CSS custom properties
consumed by `.wu-shape-fill`. That is correct while the host is on, but when
the host is off there is no fill to paint. Menu items and nav links lost their
hover/selected/current backgrounds until explicit native fallbacks were added.
Any host migration must define both states: host-on (fill) and host-off
(original background).

### 8. Perceived radius changed even when the arc radius did not

With `p = 1.6R`, the corner consumes more of the edge. The radius token is
preserved, but the visual corner is larger and softer than the original. For
small components (menu rows, toasts, callouts) this reads as a different
component, not as the same radius with a smoother junction. If the goal is
"same apparent radius", the geometry needs a different compensation strategy,
or it should not be applied globally.

### 9. Partial migration created inconsistency

Some components were hosted, some were left native, and some were hosted only
for fill but not for border/shadow. At that point the gallery no longer had one
visual rule. A half-migrated library is worse than either a fully native one
or a fully verified opt-in one.

## Rules for the next attempt

1. **Default off.** The library must render native radii unless a component is
   explicitly opted in. No auto-scan of `.wu-*` selectors.
2. **One component at a time.** Opt in, capture default/hover/focus/active/
   disabled/checked/open states, compare with the native baseline, then move to
   the next component.
3. **Do not replace transitions.** Add a property to the existing transition
   list, or animate the fill layer separately.
4. **Measure layout, not transforms.** Use computed width/height.
5. **Wrap replaced elements.** Never put host children inside `input`,
   `textarea`, `select`, `img`, `canvas`, or other replaced elements.
6. **Separate shadow from motion filter.** Do not put the shape shadow on the
   same `filter` that the motion runtime animates.
7. **Do not use `filter` on a container with fixed descendants** unless the
   containing-block change is intended.
8. **Keep a fallback path for host-off.** Every state moved to the fill needs a
   native background fallback.
9. **Test capsules first.** Confirm `p > min(w, h) / 2` returns no path and the
   native radius is untouched.
10. **Test perceived radius, not only the token.** The user sees the corner
    extent, not the numeric `border-radius`.

## Safe resume recipe

Start from the current native baseline. Add the host back only for a single
component, for example a button:

```js
WulonShape.mount(button, { shape: "clothoid" });
```

Then verify all of these against the native screenshot:

- default, hover, active/press, focus-visible, disabled;
- open/close and scale/pop animations;
- border, shadow, and focus ring at every corner;
- exact radius token and capsule behavior;
- desktop and mobile.

Only after that should the next component be opted in.

## Snapshot warning

`README.shape-host.md` and `MOTION.shape-host.md` describe the experiment as if
it were live. They are snapshots, not current documentation. The live docs
describe the native baseline.
