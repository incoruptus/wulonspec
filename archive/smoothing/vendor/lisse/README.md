# Lisse path-only vendor

Vendored from `@lisse/core@0.7.3` (MIT), path generation only.

- Source: https://github.com/JaceThings/Lisse
- Package: https://www.npmjs.com/package/@lisse/core
- Original file: `dist/chunk-BL6ZAFLB.js`
- Local change: the ESM `export { ... }` tail was replaced with a classic
  `window.LissePath` bridge so the gallery can load it before `squircle.js`
  without a build step. The geometry code is otherwise unmodified.

`LICENSE` is the upstream MIT license. This vendor is used for the
`clothoid` (G2) curve and is attributed in the gallery README.
