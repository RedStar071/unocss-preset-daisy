---
'@redstar071/unocss-preset-daisy': minor
---

Cover every daisyUI component, including the ones preset-wind used to shadow.

- **No more dropped CSS fallback chains.** daisyUI ships progressive-enhancement declarations as
  repeated properties (`height: ['4rem', 'calc(4rem + env(safe-area-inset-bottom))']`). They were
  collected into a plain object, so only the last value survived and the fallback was lost. The
  preset now emits `CSSEntriesInput`, which keeps every declaration. Fixes `.dock`, `.dock-xs`…
  `.dock-xl`, `.drawer-side`, `.steps .step`, `.steps-horizontal`, `.steps-vertical`,
  `.tab-content`, `.select`'s `::picker(select)` shadow and the `react-day-picker` / `pikaday`
  shims — 18 declarations in total.
- **Name clashes with preset-wind are now decided by preset order.** `filter`, `table`, `tab`
  (preset-wind3/4) and `collapse` (preset-wind4) exist in both. UnoCSS checks `rulesStaticMap`
  before any dynamic rule, so the preset's dynamic rules always lost, whatever the preset order.
  They are registered as static rules now: list `presetDaisy()` **after** the wind preset and every
  daisyUI component wins. The `rules.filter(...)` workaround the README used to recommend is no
  longer needed.
- **Regression coverage.** `tests/coverage.test.ts` asserts that each of the ~650 class names
  daisyUI's plugin emits resolves to a rule, that no declaration is dropped, and that no component
  is shadowed by preset-wind3 or preset-wind4.
- **The demo page now renders all 61 daisyUI components**, grouped like daisyui.com/components,
  with a theme controller.
