# Contributing to circleci-autocancel

Thank you for your interest in contributing!

## Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run tests:
   ```bash
   pnpm test
   ```

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run verification:
   ```bash
   pnpm run verify
   ```
4. Commit your changes
5. Push to your fork and submit a pull request

## Scripts

- `pnpm run build` - Build the TypeScript code
- `pnpm run test` - Run tests with coverage
- `pnpm run dev:test` - Run tests in watch mode
- `pnpm run lint` - Run linter
- `pnpm run format` - Format code with oxfmt
- `pnpm run typecheck` - Type check without building
- `pnpm run verify` - Run all checks (typecheck, lint, format, test)

## Release Process

Releases are staged via GitHub Actions when a version tag is pushed. The workflow
creates a GitHub Release and submits the npm package with `npm stage publish`;
the npm package is not public until the staged package is approved on npmjs.com.

1. Start from an up-to-date `main` branch and confirm the working tree only has
   the release changes you intend to publish.
2. Update the version. Stable releases use the patch/minor/major scripts:
   ```bash
   pnpm run release:patch  # for patch release
   pnpm run release:minor  # for minor release
   pnpm run release:major  # for major release
   ```
   For an npm prerelease, use `pnpm version` directly, for example:
   ```bash
   pnpm version 0.0.8-rc.0
   ```
3. Push `main` and the version tag:
   ```bash
   git push origin main
   git push origin v0.0.8
   ```
4. Watch the Release workflow. It validates that the tag matches
   `package.json`, builds the package, stages it on npm, and creates the GitHub
   Release. Stable versions are staged with the `latest` npm dist-tag;
   prerelease versions such as `0.0.8-rc.0` are staged with the first
   prerelease identifier as the dist-tag (`rc` in this example).
5. Before approving the staged npm package, download and inspect it:
   ```bash
   npm stage download <staged-package-id>
   ```
   Confirm the tarball version, `package.json`, `dist/cli.js`, and npm `bin`
   entry are correct. Installing the tarball in a temporary project should
   create `node_modules/.bin/circleci-autocancel`.
6. Approve the intended staged package on npmjs.com with 2FA. Do not approve an
   older staged package if multiple staged versions are waiting.

## Code Style

- We use oxfmt for code formatting
- We use oxlint for linting
- TypeScript strict mode is enabled

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Maintain or improve code coverage
