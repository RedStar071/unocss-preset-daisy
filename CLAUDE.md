# CLAUDE.md

The project conventions for this repository live in [AGENTS.md](./AGENTS.md) — read it before
changing anything. This file only repeats the parts you need on every task.

## Quality gates (in this order)

```sh
pnpm lint       # oxlint --type-aware && oxfmt --check .
pnpm typecheck  # tsc --noEmit
pnpm test       # vitest run
pnpm build      # tsdown (+ publint + attw)
```

`pnpm lint:fix` applies the auto-fixable half of the first gate.

## Non-negotiables

- Add a changeset (`pnpm changeset`) for every user-facing change; CI fails the PR without one.
- Never hand-edit `package.json#version`, `CHANGELOG.md` or `pnpm-lock.yaml`.
- Conventional Commits for commit messages and PR titles.
- The daisyUI compatibility workarounds in `src/index.ts` (`BUBBLE`, the `&` prelude resolution,
  the `theme.extend` hoisting, the array-of-style-objects branch in `src/parser.ts`) are all
  load-bearing. AGENTS.md explains which daisyUI version needs each one.
