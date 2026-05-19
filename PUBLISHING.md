# Publishing

## Publish for `npx`

The npm package is published as `@msalman5230/image-understand-mcp` and exposes a CLI binary named `image-understand-mcp`, so users do not need to point their MCP client at `dist/index.js`.

Before publishing:

```bash
npm run check
npm pack --dry-run
```

Publish:

```bash
npm login
npm publish --access public
```

Scoped npm packages must use `--access public` on publish unless you want a private/restricted package.

After that, MCP clients can launch the server with:

```bash
npx -y @msalman5230/image-understand-mcp
```

For unreleased local testing, keep using `node dist/index.js`, or run `npm link` from this repo and use the linked `image-understand-mcp` binary.

## Release Versions

The first public release is `1.0.0`.

For future releases, use npm's semver bump command from the repo root:

```bash
npm version patch
git push origin main --follow-tags
```

Use `patch` for fixes, `minor` for backward-compatible features, and `major` for breaking changes.


