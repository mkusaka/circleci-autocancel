# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
