# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets).

- Add a changeset for every user-facing change: `pnpm changeset`.
- Never edit `package.json#version` or `CHANGELOG.md` by hand — the `release` workflow owns both.
- Merging to `main` opens/updates a `chore: update changelog and release` PR; merging that PR
  publishes to npm with provenance using the `NPM_PUBLISH_TOKEN` repository secret.
