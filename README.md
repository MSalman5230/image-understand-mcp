# Image Understanding MCP Server

Local MCP server that lets an LLM agent without native vision understand local image files through Google Gemini or another Google-accessible vision-capable model ID.

The server runs over stdio and exposes one tool: `analyze_image`.

## Requirements

- Node.js 18 or newer
- A Gemini API key in `GEMINI_API_KEY`
- Local image files (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`, `.heic`, `.heif`)

## Install

```bash
npm install
npm run build
```

## Environment

- `GEMINI_API_KEY`: required Google Gemini API key
- `GEMINI_MODEL`: optional model ID, defaults to `gemini-3.5-flash`
- `IMAGE_UNDERSTANDING_INLINE_LIMIT_BYTES`: optional inline image limit, defaults to 18 MiB
- `IMAGE_UNDERSTANDING_MAX_IMAGE_BYTES`: optional maximum image size, defaults to 100 MiB

Gemma support in v1 is configuration-based: set `GEMINI_MODEL` to a Google-accessible, vision-capable Gemma model ID if your account/runtime supports it. This server does not include a local Gemma runtime.

## Tool

`analyze_image`

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

Add this to `~/.codex/config.toml` after running `npm run build`:

```toml
[mcp_servers.image_understanding]
command = "node"
args = ["C:/MegaSync/Projects/Git/image-understanding-mcp/dist/index.js"]
env = { GEMINI_API_KEY = "YOUR_KEY", GEMINI_MODEL = "gemini-3.5-flash" }
```

You can also keep the API key outside the config and let Codex inherit the environment:

```toml
[mcp_servers.image_understanding]
command = "node"
args = ["C:/MegaSync/Projects/Git/image-understanding-mcp/dist/index.js"]
env = { GEMINI_MODEL = "gemini-3.5-flash" }
```

## OpenCode Config

Add this to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "image_understanding": {
      "type": "local",
      "command": ["node", "C:/MegaSync/Projects/Git/image-understanding-mcp/dist/index.js"],
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

- `Use image_understanding to analyze C:/Users/me/Desktop/screenshot.png`
- `Use analyze_image on ./diagram.png with mode objects and detail detailed`
- `Extract all visible text from ./receipt.jpg using OCR mode`

## Development

```bash
npm test
npm run build
npm run check
```

For stdio MCP servers, stdout is reserved for JSON-RPC messages. This server writes diagnostics to stderr only.
