# Fonts

All runtime faces are variable.

| File | Family | Axis | Source |
|---|---|---|---|
| `sora-variable.woff2` | Sora | `wght` 100–800 | [Google Fonts / Sora](https://fonts.google.com/specimen/Sora), OFL |
| `misans-vf.woff2` | MiSans VF | `wght` 150–700 | Local full `MiSansVF.ttf`, converted to WOFF2 |
| `geist-mono-variable.woff2` | Geist Mono | `wght` 100–900 | [Google Fonts / Geist Mono](https://fonts.google.com/specimen/Geist+Mono), OFL |
| `cascadia-code.ttf` | Cascadia Code | static 400 | Fallback only |

`OFL-Sora.txt` and `OFL-GeistMono.txt` are the licenses for the two OFL faces. MiSans is distributed by Xiaomi; keep its license with the app when shipping.

## MiSans VF

The runtime uses the **full** MiSans VF, not a gallery subset. It covers 29,571 glyphs with the full `wght` 150–700 axis, so any Chinese string a consumer puts in a component stays in one family and interpolates weight continuously.

The stack is:

```text
Sora → MiSans VF → PingFang SC → HarmonyOS Sans SC → Microsoft YaHei
     → Noto Sans SC → Source Han Sans SC → system-ui
```

Sora's `@font-face` has a Latin `unicode-range`; MiSans handles the rest. Do not reintroduce a page-specific MiSans subset: missing glyphs would fall back per character and mix CJK families inside one word.

The WOFF2 is about 12 MB. It is a local, self-hosted asset; serve it with long-lived caching (or preload it when Chinese copy is above the fold). Keep `font-display: swap` unless a blank-text flash is preferable to a short FOUT.
