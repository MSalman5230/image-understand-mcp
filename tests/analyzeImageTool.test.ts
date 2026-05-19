import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { handleAnalyzeImage } from "../src/analyzeImageTool.js";

let tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "image-understanding-mcp-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("handleAnalyzeImage", () => {
  it("returns text and structured content for a valid image", async () => {
    const dir = await makeTempDir();
    await writeFile(path.join(dir, "sample.jpg"), Buffer.from([1, 2, 3]));
    const analyzer = {
      model: "fake-vision-model",
      analyze: vi.fn().mockResolvedValue("The image contains a simple test fixture."),
    };

    const result = await handleAnalyzeImage(
      {
        image_path: "sample.jpg",
        question: "What is shown?",
        mode: "objects",
        detail: "brief",
      },
      {
        analyzer,
        cwd: dir,
      },
    );

    expect(result).not.toHaveProperty("isError");
    expect(result.content[0].text).toContain("The image contains a simple test fixture.");
    expect(result.structuredContent).toMatchObject({
      backend: "gemini",
      model: "fake-vision-model",
      mime_type: "image/jpeg",
      size_bytes: 3,
      mode: "objects",
      detail: "brief",
      analysis: "The image contains a simple test fixture.",
    });
    expect(result.structuredContent.prompt).toContain("What is shown?");
    expect(analyzer.analyze).toHaveBeenCalledOnce();
  });

  it("returns an MCP tool error response for invalid image paths", async () => {
    const dir = await makeTempDir();
    const analyzer = {
      model: "fake-vision-model",
      analyze: vi.fn(),
    };

    const result = await handleAnalyzeImage(
      {
        image_path: "missing.png",
      },
      {
        analyzer,
        cwd: dir,
      },
    );

    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        code: "IMAGE_NOT_FOUND",
      },
    });
    expect(result.content[0].text).toContain("IMAGE_NOT_FOUND");
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });

  it("passes extreme_detail mode into the generated prompt", async () => {
    const dir = await makeTempDir();
    await writeFile(path.join(dir, "sample.png"), Buffer.from([1, 2, 3]));
    const analyzer = {
      model: "fake-vision-model",
      analyze: vi.fn().mockResolvedValue("Exhaustive image analysis."),
    };

    const result = await handleAnalyzeImage(
      {
        image_path: "sample.png",
        mode: "extreme_detail",
      },
      {
        analyzer,
        cwd: dir,
      },
    );

    expect(result).not.toHaveProperty("isError");
    expect(result.structuredContent.mode).toBe("extreme_detail");
    expect(result.structuredContent.prompt).toContain("Describe everything visible");
  });
});
