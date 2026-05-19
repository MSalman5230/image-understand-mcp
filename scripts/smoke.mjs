#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadEnvFile(path.join(repoRoot, ".env.local"));

const imagePath = process.argv[2];
const question = process.argv.slice(3).join(" ").trim() || "What is this image?";

if (!imagePath) {
  console.error("Usage: npm run smoke -- <image-path> [question]");
  console.error('Example: npm run smoke -- "C:/tmp/image.png" "What is this image?"');
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY was not found. Add it to .env.local or set it in your shell.");
  process.exit(1);
}

const { createGoogleVisionAnalyzerFromEnv } = await import("../dist/googleVision.js");
const { handleAnalyzeImage } = await import("../dist/analyzeImageTool.js");

const analyzer = createGoogleVisionAnalyzerFromEnv();
const result = await handleAnalyzeImage(
  {
    image_path: imagePath,
    question,
    detail: "brief",
  },
  {
    analyzer,
    cwd: process.cwd(),
  },
);

if (result.isError) {
  console.error(result.content[0].text);
  process.exit(1);
}

console.log(result.content[0].text);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = unwrapEnvValue(rawValue);
  }
}

function unwrapEnvValue(value) {
  const quote = value[0];

  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    return value.slice(1, -1);
  }

  return value;
}
