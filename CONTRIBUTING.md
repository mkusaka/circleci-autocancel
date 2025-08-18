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
- `pnpm run format` - Format code with prettier
- `pnpm run typecheck` - Type check without building
- `pnpm run verify` - Run all checks (typecheck, lint, format, test)

## Release Process

Releases are automated via GitHub Actions when a version tag is pushed:

1. Update version:
   ```bash
   pnpm run release:patch  # for patch release
   pnpm run release:minor  # for minor release
   pnpm run release:major  # for major release
   ```
2. The release workflow will automatically publish to npm

## Code Style

- We use Prettier for code formatting
- We use oxlint for linting
- TypeScript strict mode is enabled

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Maintain or improve code coverage
