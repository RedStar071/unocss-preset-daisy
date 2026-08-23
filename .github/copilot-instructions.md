# Copilot instructions

Full project conventions: [AGENTS.md](../AGENTS.md). Summary:

- This repo is an **UnoCSS preset for daisyUI**. It calls daisyUI's tailwind plugin API at build
  time and converts the resulting JS-in-CSS objects into UnoCSS rules — it never parses daisyUI's
  shipped CSS.
- TypeScript, ESM only, `pnpm`. Bundled with `tsdown`, linted with `oxlint`, formatted with `oxfmt`
  (tabs, width 150, single quotes, no trailing comma), tested with `vitest`.
- Before committing, run in order: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Add a changeset (`pnpm changeset`) for every user-facing change. Never edit
  `package.json#version`, `CHANGELOG.md` or `pnpm-lock.yaml` by hand.
- Commit messages and PR titles follow Conventional Commits.
- Both daisyUI v4 and v5 are supported. `tests/compat.test.ts` covers the shared subset and must
  keep passing on `4.12.14`, `5.0.24` and `latest`.
- Comments explain _why_ a workaround exists, naming the daisyUI version that needs it.
