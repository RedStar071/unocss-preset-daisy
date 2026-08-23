# @redstar071/unocss-preset-daisy

> [UnoCSS](https://github.com/unocss/unocss) preset for [daisyUI](https://github.com/saadeghi/daisyui)

This preset uses the styles of your installed daisyUI version directly, without pregeneration, and
supports variants. It works with daisyUI **v4** and **v5** (including the newest 5.7 releases).

[Demo here](https://redstar071.github.io/unocss-preset-daisy/)

## 🚀 Installation

```sh
npm install unocss daisyui @redstar071/unocss-preset-daisy
```

`daisyui` and `unocss` are peer dependencies:

| peer      | supported range          |
| --------- | ------------------------ |
| `daisyui` | `^4.12.14` or `>=5.0.24` |
| `unocss`  | `^66.1.2`                |

> daisyUI `5.0.0` – `5.0.23` cannot be used: those releases import their own `package.json` without
> an import attribute and fail to load under Node's ESM loader. Upgrade to `5.0.24` or newer.

## 📱 Usage

### 📋 Notes

- **pseudo classes** \
  UnoCSS preset-mini uses e.g. "file" as a pseudo-class variant to style the button of file inputs,
  while assuming ":" and "-" [as variant separators](https://unocss.dev/config/#separators). To
  avoid conflicts with e.g. `file-input`, limit the separator in your UnoCSS config to ":" only:
    ```js
    ...
      separators: [':']
    ...
    ```
- **colliding rules** \
  preset-mini / preset-wind3 ship `tab` and `table` rules that shadow the daisyUI components of the
  same name. Filter them out if you need the components — see `demo/uno.config.ts`.
- **variable prefixes** \
  By default, the UnoCSS Mini preset uses `un-`
  [as variable prefix](https://unocss.dev/presets/mini#variableprefix) for transformation values,
  while daisyUI uses Tailwind's `tw-`. This preset rewrites `tw-` to `un-`. You can define a custom
  prefix with the `variablePrefix` option, which should align with the Mini preset.
- **Theme colors** \
  Since v1.2 the preset registers daisyUI's design tokens on the UnoCSS theme itself, so
  `bg-primary`, `text-base-content`, `rounded-box`, … work out of the box. No manual
  `daisyui/functions/variables.js` import is needed anymore.
- **Cascade layers** \
  daisyUI ≥ 5.1 wraps its component styles in nested `@layer daisyui.l1[.l2…]` cascade layers, and
  the preset preserves them. Unlayered CSS — including your UnoCSS utilities — therefore keeps
  winning over daisyUI component styles, exactly like in a Tailwind + daisyUI setup.
- **daisyUI variants** \
  Variants that daisyUI registers itself (`is-drawer-open:` and `is-drawer-close:` since v5.1) are
  re-exported as UnoCSS variants, e.g. `is-drawer-open:opacity-100`.
- **Reset css** \
  `@unocss/reset` comes with `unocss`. If you are using pnpm, install it separately unless you
  enable hoisting.
- **Development styles** \
  If a dev environment with `virtual:unocss-devtools` overlays css rule priority, use `safelist` to
  make sure the affected classes are generated. See
  [Edit classes in DevTools](https://unocss.dev/integrations/vite#edit-classes-in-devtools).

### Vite

`vite.config.ts`

```js
import { presetDaisy } from '@redstar071/unocss-preset-daisy';
import { presetWind4 } from 'unocss';
import unocss from 'unocss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		unocss({
			presets: [presetWind4(), presetDaisy()],
			separators: [':']
		})
	]
});
```

`main.ts`

```js
import '@unocss/reset/tailwind.css';
import 'virtual:uno.css';
```

### Astro

```js
import { presetDaisy } from '@redstar071/unocss-preset-daisy';
import { defineConfig } from 'astro/config';
import { presetWind4 } from 'unocss';
import unocss from 'unocss/astro';

export default defineConfig({
	integrations: [
		unocss({
			injectReset: true,
			presets: [presetWind4(), presetDaisy()],
			separators: [':']
		})
	]
});
```

### Nuxt

To use UnoCSS with Nuxt, `@unocss/nuxt` must be installed as well.

```js
import { presetDaisy } from '@redstar071/unocss-preset-daisy';
import { defineNuxtConfig } from 'nuxt/config';
import { presetWind4 } from 'unocss';

export default defineNuxtConfig({
	css: ['@unocss/reset/tailwind.css'],
	modules: ['@unocss/nuxt'],
	unocss: {
		presets: [presetWind4(), presetDaisy()],
		separators: [':']
	}
});
```

## 🛠️ Config

This preset accepts [the same config as daisyUI](https://daisyui.com/docs/config/), plus
`variablePrefix`:

```js
{
	presets: [
		presetWind4(),
		presetDaisy({
			themes: ['light --default', 'dark --prefersdark'],
			variablePrefix: 'un-'
		})
	];
}
```

## ⚠️ Limitations

- **This is not a full daisyUI port.** \
  All daisyUI components/utilities should work but they may not work with some UnoCSS features.
- **Some unused styles may be imported.** \
  This is both due to lots of hacks being used and how UnoCSS works. However, the preset will try to
  figure out the minimum styles needed, thus the cost is trivial most of the time.
- **`@scope` scope roots are not variant-aware.** \
  daisyUI's `.join` uses `@scope (&)`; the preset resolves `&` to the plain component selector, so
  the scope root stays `.join` even when the utility itself is generated behind a variant.

## 🤝 Contributing

See [AGENTS.md](./AGENTS.md) for the project conventions. In short:

```sh
pnpm install
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm dev        # runs the demo page
pnpm changeset  # required for every user-facing change
```
