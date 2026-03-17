# Trusted Publishing (npm + GitHub Actions)

This repository uses npm Trusted Publishing via GitHub Actions OIDC.

## Why

- No long-lived `NPM_TOKEN` in repo secrets
- Short-lived publish credentials issued per workflow run
- Better provenance and supply-chain metadata (`--provenance`)

## One-time Setup

1. Go to npm package settings for `subagent-harness`.
2. Enable Trusted Publishing.
3. Add this repository as trusted source:
   - Owner: `ERerGB`
   - Repository: `subagent-harness`
   - Workflow file: `.github/workflows/publish-npm.yml`
   - Environment (if required by npm UI): `npm-publish`
4. In GitHub repo settings, ensure environment `npm-publish` exists.
   - Optional: require manual reviewers for production publish protection.

## Release Flows

### First public publish (manual)

- Run workflow: `Publish to npm (Trusted Publishing)` via `workflow_dispatch`.

### Ongoing releases (tag-driven)

```bash
git tag v0.1.1
git push origin v0.1.1
```

Tag push triggers the same publish workflow.

## Notes

- The package name must be available on npm.
- `package.json` version must be bumped before publish.
- Workflow runs `npm pack --dry-run` before `npm publish`.

