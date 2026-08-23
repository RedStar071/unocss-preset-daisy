# AGENTS.md

Working notes for `@redstar071/unocss-preset-daisy` — an [UnoCSS](https://unocss.dev) preset that
turns the [daisyUI](https://daisyui.com) tailwind plugin into on-demand UnoCSS rules, without any
pregenerated CSS.

## Stack

- **Language:** TypeScript (`~5.9.3`), ESM only, Node `^20.19 || ^22.12 || >=24`.
- **Package manager:** `pnpm`, corepack-pinned via `packageManager` in `package.json` (check that
  field for the exact version, do not hardcode it here).
- **Bundler:** `tsdown` (`tsdown.config.ts`), with `publint` and `attw` gates wired into the build.
- **Tests:** `vitest` (`vitest.config.ts`, specs in `tests/`).
- **Lint:** `oxlint` with `oxlint-tsgolint` (type-aware) — `.oxlintrc.json`.
- **Format:** `oxfmt` — `.oxfmtrc.json` (tabs, width 150, single quotes, no trailing comma).
- **Dead code:** `knip` — `knip.json`.
- **Release:** [Changesets](https://github.com/changesets/changesets) — `.changeset/`, driven by
  `.github/workflows/release.yml`. Publishes with npm provenance (`id-token: write`).

## Quality gates (in this order)

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

`pnpm lint:fix` applies the auto-fixable half of gate 1. `pnpm build:demo` additionally checks that
the demo page still compiles; CI runs it in the `build` job.

## How the preset works

`presetDaisy()` never reads daisyUI's shipped CSS. It calls daisyUI's **tailwind plugin API** and
converts the JS-in-CSS objects it hands back into UnoCSS rules:

1. `src/index.ts` resolves the plugin. daisyUI v5 exports `plugin.withOptions(…)` — a function
   returning `{ config, handler }`; daisyUI v4 exports the resolved object directly.
2. `handler(…)` is invoked with a fake tailwind API (`addBase`, `addComponents`, `addUtilities`,
   `addVariant`, `config`). The ambient types for it live in `src/daisyui.d.ts`, because daisyUI
   ships no declarations for its entry point.
3. `src/parser.ts` (derived from `postcss-js`) converts each style object into a postcss AST.
4. A small postcss pipeline runs over that AST: a local `fix-css` plugin followed by
   `postcss-nested`.
5. `flattenRules` walks the flattened AST and yields `[parents, selector, declarations]` tuples,
   which become `CSSObjectInput`s keyed by class token, wired up through UnoCSS's `symbols.layer` /
   `symbols.parent` / `symbols.selector` / `symbols.sort`.
6. `addBase` output becomes preflights in the `daisy-base` layer; components and utilities become
   dynamic rules in `daisy-components` / `daisy-utilities`.

### daisyUI version specifics

Everything below is load-bearing — removing it re-breaks a supported daisyUI release:

- **`@layer daisyui.l1[.l2…]` sublayers (v5.1+).** daisyUI wraps component styles in nested cascade
  layers and hoists them out of the selector, which yields `{ '.btn': [{ '@layer …': {…} }, …] }`.
  `parse` therefore has to accept **arrays of style objects**, not just the postcss-js "array of
  fallback values" shape. The layers are preserved verbatim in the output; nesting alone determines
  their order (a sublayer always loses to its parent layer's own rules), so no `@layer` statement
  rule is needed. Unlayered UnoCSS utilities keep beating daisyUI components, as intended.
- **`@scope (&)` (v5.1+, used by `.join`).** `postcss-nested` does not know `@scope`, so it is added
  to `BUBBLE` in `src/index.ts`, and the `fix-css` plugin resolves `&` in _any_ at-rule prelude
  against the nearest ancestor rule **before** the at-rule bubbles up.
- **`addVariant` (v5.1+).** daisyUI registers `is-drawer-open` / `is-drawer-close` through the plugin
  API. They are re-exported as UnoCSS variants (`daisy-is-drawer-open`, …) matching on `<name>:`.
- **`@starting-style`.** Handled by `postcss-nested`'s default bubbling — do **not** reintroduce the
  old "smuggle it through as a declaration" hack, it produced invalid `@starting-style:{…}` output.
- **`theme.extend` (v4 and v5, unversioned — both return `{ theme: { extend: variables } }`).**
  daisyUI returns its design tokens in the tailwind `theme.extend` shape. The preset hoists them
  into the UnoCSS `theme`, so `bg-primary` / `rounded-box` work with no extra user config. Do not
  re-add `daisyui/functions/variables.js` to the demo config.
- **Minimum v5 is `5.0.24`.** Earlier 5.0.x releases do `import { version } from "./package.json"`
  without an import attribute and cannot be loaded by Node's ESM loader at all. That is why
  `peerDependencies.daisyui` is `^4.12.14 || >=5.0.24` and not `^5.0.0`.
- **daisyUI v4 is still supported.** The `config: (key) => …` shim in the fake plugin API exists only
  for v4; `tests/compat.test.ts` guards the v4 ∩ v5 subset and CI runs it against `4.12.14`,
  `5.0.24` and `latest`.

## Conventions

- Commits and PR titles follow Conventional Commits; the PR title is enforced by
  `.github/workflows/semantic-pull-requests.yml` (scopes: `preset`, `parser`, `demo`, `deps`,
  `release`, `ci`).
- Test names read `given <situation> then <expectation>`.
- Comments explain _why_ a workaround exists, ideally naming the daisyUI version that needs it.

## Notes for agents

- Do **not** edit `pnpm-lock.yaml` by hand; run `pnpm install` after touching `package.json`.
- Do **not** edit `package.json#version` or `CHANGELOG.md`; Changesets owns both. Add a changeset
  with `pnpm changeset` for every user-facing change — CI fails the PR otherwise.
- When bumping daisyUI, run `pnpm test` first: a new `@` at-rule nested inside a rule surfaces as
  `Error: unexpected mixed declarations node` from `flattenRules`. The fix is usually one entry in
  `BUBBLE` plus a regression test, not a change to the flattener.
- The demo config must keep `separators: [':']` and must keep filtering preset-wind3's `tab`/`table`
  rules — both collide with daisyUI component names. The README documents why.
- CI uses `pnpm/action-setup` + `actions/setup-node` rather than the newer `pnpm/setup@v2` used by
  `wolfstar-project/stars-components`: that action requires pnpm >= 11, and this repo is still
  pinned to pnpm 10. Bump `packageManager` first if you want to switch.
- Repository secrets used by CI: `NPM_PUBLISH_TOKEN` (release), `CODECOV_TOKEN` (coverage upload),
  optional `RELEASE_TOKEN` (falls back to `GITHUB_TOKEN`).
