# Smoothing archive

This directory is a folded-away experiment. It is **not loaded** by
`../../index.html` and is not part of the live component behavior.

Start with [LESSONS.md](LESSONS.md) for the failure analysis and the safe
resume recipe.

- `squircle.js` — the generic shape host
- `wulon.shape-host.css` / `motion.shape-host.css` — the shape-host-era CSS
- `index.shape-host.html` — the page shell that loaded it
- `vendor/lisse/` — MIT path-only clothoid source
- `README.shape-host.md` / `MOTION.shape-host.md` — the docs written while the
  experiment was live; they describe the experiment, not the current library

The live library is back on native radii. Any future attempt should start with
one component, not a global auto-mount.
