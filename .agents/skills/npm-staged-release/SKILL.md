---
name: npm-staged-release
description: Release this repo's npm package through GitHub Actions and npm staged publishing. Use when cutting stable or prerelease versions, pushing release tags, inspecting Release workflow logs, downloading staged npm tarballs, verifying package contents, or deciding which staged npm package should be approved.
---

# npm Staged Release

Use this skill to cut and verify `circleci-autocancel` releases. The repository publishes through GitHub Actions with `npm stage publish`; npm publication is not complete until the staged package is manually approved on npmjs.com.

## Release Workflow

1. Inspect current state before changing anything:
   - `git status --short`
   - `git fetch origin --prune`
   - `git log --oneline -5`
   - `gh release view <tag>` when reusing or checking a tag
   - `npm view circleci-autocancel version` to see the current public `latest`
2. Work from current `origin/main`. If a separate worktree is needed, use `wt`, not `git worktree add`.
3. Choose the version intentionally:
   - Stable patch/minor/major: use `pnpm run release:patch`, `pnpm run release:minor`, or `pnpm run release:major`.
   - Prerelease or RC: use `pnpm version <version>`, for example `pnpm version 0.0.8-rc.0`.
4. Confirm the release commit and tag point at the intended state:
   - `git show --stat --oneline --decorate HEAD`
   - `git tag --points-at HEAD`
   - `node -p "require('./package.json').version"`
5. Push both `main` and the tag:
   - `git push origin HEAD:main`
   - `git push origin <tag>`
6. Watch the Release workflow with `gh`:
   - `gh run list --workflow Release --limit 5`
   - `gh run view <run-id> --log`

## Workflow Expectations

The release workflow should:

- Accept full semver tags like `v1.2.3` and prerelease tags like `v1.2.3-rc.0`.
- Require the tag version to match `package.json`.
- Build before staged publishing so `dist/cli.js` exists when npm validates `bin`.
- Stage stable versions with npm dist-tag `latest`.
- Stage prerelease versions with the first prerelease identifier as the npm dist-tag, such as `rc` for `0.0.8-rc.0` or `beta` for `0.0.8-beta.0`.
- Create stable GitHub Releases for stable tags and prerelease GitHub Releases for prerelease tags.

## Staged Package Verification

Always verify the staged package before telling the user to approve it.

1. Extract the staged package id from the Release workflow log:
   - Look for `staged with id <uuid>`.
   - Also record the package version and npm dist-tag from the log.
2. Download the staged package:
   ```bash
   tmpdir=$(mktemp -d)
   cd "$tmpdir"
   npm stage download <staged-package-id>
   ```
   Use `npx -y npm@11.16.0 stage download <staged-package-id>` if the local npm does not support `stage`.
3. Inspect the tarball:
   ```bash
   tgz=$(ls *.tgz)
   tar -tzf "$tgz" | sort
   tar -xOf "$tgz" package/package.json
   tar -xOf "$tgz" package/dist/cli.js | sed -n '1,6p'
   ```
4. Install the tarball in a temporary project and verify the CLI bin link:
   ```bash
   npm init -y >/dev/null
   npm install --ignore-scripts "./$tgz" >/dev/null
   ls -l node_modules/.bin/circleci-autocancel
   ```

The tarball should include `LICENSE`, `README.md`, `package.json`, and `dist/*`. `package.json` should have the intended version and `bin.circleci-autocancel` should point at `dist/cli.js`. `dist/cli.js` should start with `#!/usr/bin/env node`, and installing the tarball should create `node_modules/.bin/circleci-autocancel`.

## Approval Guidance

When multiple staged packages exist, be explicit about which package should be approved and which should not.

- Approving a package staged with `latest` makes it the public stable release.
- Approving a package staged with `rc`, `beta`, or another prerelease dist-tag does not make it `latest`.
- If the user wanted an RC-style validation release, approve the prerelease staged package and leave any older `latest` staged package unapproved unless the user explicitly asks for the stable publish.

Report the GitHub Release URL, workflow run URL, staged package id, npm dist-tag, current public `npm view circleci-autocancel version`, and verification results.
