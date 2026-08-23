---
'@redstar071/unocss-preset-daisy': minor
---

Support the latest daisyUI 5 releases, register the daisyUI theme automatically and re-export
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
