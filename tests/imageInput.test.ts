import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  ImageInputError,
  detectImageMimeType,
  loadImageInput,
  resolveLocalImagePath,
} from "../src/imageInput.js";

let tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "image-understand-mcp-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("image input helpers", () => {
  it("detects supported image MIME types from extensions", () => {
    expect(detectImageMimeType("example.PNG")).toBe("image/png");
    expect(detectImageMimeType("photo.jpeg")).toBe("image/jpeg");
    expect(detectImageMimeType("picture.webp")).toBe("image/webp");
  });

  it("rejects unsupported image extensions", () => {
    expect(() => detectImageMimeType("notes.txt")).toThrow(ImageInputError);
  });

  it("resolves relative local paths from cwd", () => {
    const resolved = resolveLocalImagePath("images/sample.png", "C:/work/project");
    expect(resolved.replaceAll("\\", "/")).toBe("C:/work/project/images/sample.png");
  });

  it("rejects remote image URLs", () => {
    expect(() => resolveLocalImagePath("https://example.com/image.png")).toThrow(
      /Only local filesystem paths/,
    );
  });

  it("loads local image metadata", async () => {
    const dir = await makeTempDir();
    const imagePath = path.join(dir, "sample.png");
    await writeFile(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const image = await loadImageInput("sample.png", { cwd: dir });

    expect(image.absolutePath).toBe(imagePath);
    expect(image.mimeType).toBe("image/png");
    expect(image.sizeBytes).toBe(4);
  });

  it("rejects missing files", async () => {
    const dir = await makeTempDir();

    await expect(loadImageInput("missing.png", { cwd: dir })).rejects.toMatchObject({
      code: "IMAGE_NOT_FOUND",
    });
  });

  it("rejects directories", async () => {
    const dir = await makeTempDir();
    await mkdir(path.join(dir, "image.png"));

    await expect(loadImageInput("image.png", { cwd: dir })).rejects.toMatchObject({
      code: "IMAGE_NOT_FILE",
    });
  });
});
