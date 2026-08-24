# @redstar071/unocss-preset-daisy

## 1.2.0

### Minor Changes

- [#2](https://github.com/RedStar071/unocss-preset-daisy/pull/2) [`75a5f07`](https://github.com/RedStar071/unocss-preset-daisy/commit/75a5f073b328a8411f985e433c86b0dfbc8c0499) Thanks [@RedStar071](https://github.com/RedStar071)! - Cover every daisyUI component, including the ones preset-wind used to shadow.

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

- [#1](https://github.com/RedStar071/unocss-preset-daisy/pull/1) [`114a56c`](https://github.com/RedStar071/unocss-preset-daisy/commit/114a56c3362efeb8da04d94c61e6da3e30bf5602) Thanks [@RedStar071](https://github.com/RedStar071)! - Support the latest daisyUI 5 releases, register the daisyUI theme automatically and re-export
  daisyUI's own variants.

    - **daisyUI >= 5.1 compatibility.** daisyUI now hoists its nested `@layer daisyui.l1[.l2…]` cascade
      layers out of the selector, which hands the plugin API arrays of style objects. The parser accepts
      that shape, and the sublayers are preserved in the generated CSS, so unlayered UnoCSS utilities
      keep winning over daisyUI component styles.
    - **`@scope` support.** `.join` uses `@scope (&)`; the `&` is now resolved against the component
      selector and the at-rule is bubbled correctly instead of failing the build with
      `unexpected mixed declarations node`.
    - **daisyUI variants.** `is-drawer-open:` and `is-drawer-close:`, which daisyUI registers through
      `addVariant`, are exposed as UnoCSS variants.
    - **Theme tokens out of the box.** daisyUI's `theme.extend` tokens are hoisted onto the UnoCSS theme,
      so `bg-primary`, `text-base-content` and `rounded-box` work without importing
      `daisyui/functions/variables.js` manually.
    - **Valid `@starting-style` output.** It is now emitted as a real at-rule instead of being smuggled
      through as a declaration, which produced invalid `@starting-style:{…}` CSS.
    - **Correct `px` suffix.** Numeric declaration values no longer gain a stray `}` (`12}px`).

    Breaking-ish housekeeping: `@tailwindcss/nesting` (an `0.0.0-insiders` prerelease) was replaced by
    `postcss-nested`, and `peerDependencies.daisyui` is now `^4.12.14 || >=5.0.24` — daisyUI 5.0.0
    through 5.0.23 cannot be loaded by Node's ESM loader at all.
