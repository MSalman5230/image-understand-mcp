import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function loadLocalEnvFiles(cwd = process.cwd()): void {
  for (const fileName of [".env.local", ".env"]) {
    loadEnvFile(path.join(cwd, fileName));
  }
}

function loadEnvFile(filePath: string): void {
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

function unwrapEnvValue(value: string): string {
  const quote = value[0];

  if ((quote === `"` || quote === "'") && value.endsWith(quote)) {
    return value.slice(1, -1);
  }

  return value;
}
