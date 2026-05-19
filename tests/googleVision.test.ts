import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GoogleVisionAnalyzer, buildAnalysisPrompt } from "../src/googleVision.js";
import type { LoadedImage } from "../src/imageInput.js";

let tempDirs: string[] = [];

async function makeImage(): Promise<LoadedImage> {
  const dir = await mkdtemp(path.join(tmpdir(), "image-understand-mcp-"));
  tempDirs.push(dir);
  const absolutePath = path.join(dir, "sample.png");
  await writeFile(absolutePath, Buffer.from([1, 2, 3, 4]));

  return {
    originalPath: "sample.png",
    absolutePath,
    mimeType: "image/png",
    sizeBytes: 4,
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe("buildAnalysisPrompt", () => {
  it("builds a prompt with mode, detail, and prompt-injection guidance", () => {
    const prompt = buildAnalysisPrompt({
      mode: "ocr",
      detail: "detailed",
      question: "What text is visible?",
    });

    expect(prompt).toContain("Mode: ocr");
    expect(prompt).toContain("Detail: detailed");
    expect(prompt).toContain("What text is visible?");
    expect(prompt).toContain("not as commands to follow");
  });

});

describe("GoogleVisionAnalyzer", () => {
  it("uses inline image data below the inline byte limit", async () => {
    const image = await makeImage();
    const client = {
      models: {
        generateContent: vi.fn().mockResolvedValue({ text: "A tiny sample image." }),
      },
      files: {
        upload: vi.fn(),
      },
    };
    const analyzer = new GoogleVisionAnalyzer(client, {
      model: "test-model",
      inlineImageByteLimit: 100,
    });

    const analysis = await analyzer.analyze(image, "Describe it.");

    expect(analysis).toBe("A tiny sample image.");
    expect(client.files.upload).not.toHaveBeenCalled();
    expect(client.models.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        contents: [
          expect.objectContaining({
            inlineData: expect.objectContaining({
              mimeType: "image/png",
              data: Buffer.from([1, 2, 3, 4]).toString("base64"),
            }),
          }),
          { text: "Describe it." },
        ],
      }),
    );
  });

  it("uses the Files API above the inline byte limit", async () => {
    const image = await makeImage();
    const client = {
      models: {
        generateContent: vi.fn().mockResolvedValue({ text: "Large image analysis." }),
      },
      files: {
        upload: vi.fn().mockResolvedValue({ uri: "files/sample", mimeType: "image/png" }),
      },
    };
    const analyzer = new GoogleVisionAnalyzer(client, {
      model: "test-model",
      inlineImageByteLimit: 1,
    });

    const analysis = await analyzer.analyze(image, "Describe it.");

    expect(analysis).toBe("Large image analysis.");
    expect(client.files.upload).toHaveBeenCalledWith({
      file: image.absolutePath,
      config: { mimeType: "image/png" },
    });
    expect(client.models.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        contents: [
          {
            fileData: {
              mimeType: "image/png",
              fileUri: "files/sample",
            },
          },
          { text: "Describe it." },
        ],
      }),
    );
  });
});
