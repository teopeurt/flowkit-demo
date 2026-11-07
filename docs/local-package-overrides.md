# Local package overrides

## When to use this

The application installs the released `@teopeurt/flowkit-*` packages from
[npmjs.org](https://www.npmjs.org/) (see
[Installing the FlowKit packages](../README.md#installing-the-flowkit-packages)). A normal install
needs no token and no `.npmrc`. Use an override only to try a FlowKit build that has not been
released yet, for example a candidate from a FlowKit pull request. FlowKit's own release workflow
does the same thing with
[`scripts/test-demo-candidate.sh`](https://github.com/teopeurt/flowkit/blob/main/scripts/test-demo-candidate.sh):
it copies this repository to a temporary directory, rewrites the six dependency declarations to the
candidate tarballs, and runs typecheck, tests, build, and the browser stack there.

## Temporary local-artifact testing

Work in an isolated clone or temporary copy. Keep the committed manifest and lockfile pinned to the
released version; do not commit `file:`, `link:`, `workspace:`, or local-registry URLs. If you have a
local registry that serves the exact artifacts, configure only that temporary copy's `.npmrc` to
point the `@teopeurt` scope at it, then run:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build
```

This is evidence for a local-artifact simulation only. It is not a published-package install.

## Restore the release configuration

Discard the temporary copy. The real repository requires no `.npmrc`: it resolves the six
`@teopeurt/flowkit-*` packages from npmjs.org with the committed lockfile. Verify from a fresh
archive:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run test
bun run build
```

Do not modify framework source or `node_modules` to make a local override work. Preserve the
repository's six exact `@teopeurt/flowkit-*` version declarations and the boundary checks in
`test/package-contracts.preflight.test.ts` and `test/package-boundary.test.ts`.
