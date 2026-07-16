# Changelog

## 0.5.2 — 2026-07-17

### Fixed

- Parse agent frontmatter with full YAML semantics, including structured values.
- Validate every GitHub Actions workflow in CI so malformed workflow files cannot silently create failed runs.
- Make downstream release notifications safe for multiline release notes and resilient when notification credentials are not configured.

### Changed

- Reframe the README around portable, interoperable agentic environments with a clearer visual and top-down information hierarchy.
- Upgrade first-party GitHub Actions to Node 24 runtime releases.

No breaking API changes are included in this release.
