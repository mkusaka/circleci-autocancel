# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### BREAKING CHANGES

- **Default behavior changed**: Now cancels ALL workflows on the same branch by default (matching CircleCI's native auto-cancel behavior)
  - Previously: Only cancelled workflows with the same name
  - Now: Cancels all workflows unless `--workflow-name` or `--workflow-name-pattern` is specified
- **CLI option renamed**: `--name-pattern` is now `--workflow-name-pattern` for clarity

### Added

- Workflow URLs in cancellation summary for easy access to cancelled workflows
- Verbose logging shows each scanned workflow with match status

## [0.0.2] - 2025-08-19

### Added

- Detailed summary of cancelled workflows showing names and pipeline numbers
- Debug output with workflow scanning metrics
- CircleCI configuration examples for monorepo setups with path-filtering orb
- Support for path-filtering orb v2.0.2

### Fixed

- Path-filtering orb version updated to v2.0.2 to fix Python compatibility issues
- Each workflow type now only cancels its own type (no cross-workflow cancellation)

### Changed

- Improved logging to show running/on_hold counts instead of generic pipeline counts
- Enhanced README with comprehensive CircleCI configuration examples

## [0.0.1] - 2025-08-18

### Added

- Initial release of circleci-autocancel
- Cancel redundant CircleCI workflows on the same branch
- Works on default branch (unlike CircleCI's built-in auto-cancel)
- Support for workflow name matching with exact match or regex patterns
- CLI tool with multiple options for customization
- Library API for programmatic usage
- Dry-run mode for safe testing
- Verbose logging option
- Configurable API rate limiting with sleep delays
