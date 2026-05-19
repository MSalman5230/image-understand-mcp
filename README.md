# Image Understand MCP Server

Local MCP server that lets an LLM agent without native vision understand local image files through Google Gemini/Gemm model ID.

The server runs over stdio and exposes image analysis tools for local image paths.

## Requirements

- Node.js 18 or newer
- A Gemini API key in `GEMINI_API_KEY`
- Local image files (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.heic`, `.heif`)

## Install

```bash
npm install
npm run build
```

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

## GitHub Actions Publishing

After the first manual publish, configure npm Trusted Publishing for package `@msalman5230/image-understand-mcp`:

- Publisher: GitHub Actions
- Repository: `MSalman5230/image-understand-mcp`
- Workflow filename: `publish.yml`

Once trusted publishing is configured, pushing a `v*.*.*` tag publishes that package version automatically.

## Environment

- `GEMINI_API_KEY`: required Google Gemini API key
- `GEMINI_MODEL`: optional model ID, defaults to `gemini-3.5-flash`
- `IMAGE_UNDERSTAND_INLINE_LIMIT_BYTES`: optional inline image limit, defaults to 18 MiB
- `IMAGE_UNDERSTAND_MAX_IMAGE_BYTES`: optional maximum image size, defaults to 100 MiB

The MCP server reads only the environment of the process that launches it. It does not load `.env`, `.env.local`, or any other dotenv file. For Codex/OpenCode usage, pass `GEMINI_API_KEY` and `GEMINI_MODEL` through that client config or through the parent shell environment.

Gemma support in v1 is configuration-based: set `GEMINI_MODEL` to a Google-accessible, vision-capable Gemma model ID if your account/runtime supports it. This server does not include a local Gemma runtime.

## Tool

`analyze_image`

Use this for specific image analysis, OCR, object detection, accessibility descriptions, charts, screenshots, receipts, diagrams, and general questions about local image files.

Inputs:

- `image_path` string, required. Local filesystem path only. Relative paths resolve from the MCP server working directory.
- `question` string, optional. A specific question about the image.
- `mode` string, optional. One of `general`, `ocr`, `objects`, or `accessibility`. Default: `general`.
- `detail` string, optional. One of `brief`, `normal`, or `detailed`. Default: `normal`.

The tool returns human-readable text plus structured content:

```json
{
  "backend": "gemini",
  "model": "gemini-3.5-flash",
  "image_path": "C:/path/to/image.png",
  "mime_type": "image/png",
  "size_bytes": 12345,
  "mode": "general",
  "detail": "normal",
  "prompt": "...",
  "analysis": "..."
}
```

## Codex Config

Add this to `~/.codex/config.toml` after publishing the package to npm:

```toml
[mcp_servers.image_understand]
command = "npx"
args = ["-y", "@msalman5230/image-understand-mcp"]
env = { GEMINI_API_KEY = "YOUR_KEY", GEMINI_MODEL = "gemini-3.5-flash" }
```

You can also keep the API key outside the config and let Codex inherit the environment:

```toml
[mcp_servers.image_understand]
command = "npx"
args = ["-y", "@msalman5230/image-understand-mcp"]
env = { GEMINI_MODEL = "gemini-3.5-flash" }
```

For local development before publishing, use the built file directly:

```toml
[mcp_servers.image_understand]
command = "node"
args = ["C:/MegaSync/Projects/Git/image-understand-mcp/dist/index.js"]
env = { GEMINI_MODEL = "gemini-3.5-flash" }
```

## OpenCode Config

Add this to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "image_understand": {
      "type": "local",
      "command": ["npx", "-y", "@msalman5230/image-understand-mcp"],
      "enabled": true,
      "environment": {
        "GEMINI_API_KEY": "{env:GEMINI_API_KEY}",
        "GEMINI_MODEL": "gemini-3.5-flash"
      }
    }
  }
}
```

## Example Prompts

- `What is this image? C:/Users/me/Desktop/screenshot.png`
- `Use analyze_image on ./diagram.png with mode objects and detail detailed`
- `Extract all visible text from ./receipt.jpg using OCR mode`

In OpenCode, MCP tools are shown as normal tools, often with the MCP server name prefixed. With the sample config above, the tool may appear as `image_understand_analyze_image`. If a model says it has no MCP tools but lists that tool, that is a model/tool-routing issue; the tool is available.

## Development

```bash
npm test
npm run build
npm run check
```

For a simple local Gemini smoke test without Codex/OpenCode, put development values in `.env.local`, build, and run:

```bash
npm run build
npm run smoke -- "C:/path/to/image.jpg" "What is this image?"
```

The smoke script loads `.env.local` for development convenience. The MCP server itself does not load dotenv files.

For stdio MCP servers, stdout is reserved for JSON-RPC messages. This server writes diagnostics to stderr only.
