#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { createAnalyzeImageErrorResult, handleAnalyzeImage } from "./analyzeImageTool.js";
import { loadLocalEnvFiles } from "./env.js";
import {
  analysisDetails,
  analysisModes,
  createGoogleVisionAnalyzerFromEnv,
  type VisionAnalyzer,
} from "./googleVision.js";

loadLocalEnvFiles();

const server = new McpServer({
  name: "image-understanding",
  version: "0.1.0",
});

let analyzer: VisionAnalyzer | undefined;

function getAnalyzer(): VisionAnalyzer {
  analyzer ??= createGoogleVisionAnalyzerFromEnv();
  return analyzer;
}

server.registerTool(
  "analyze_image",
  {
    title: "Analyze Image",
    description:
      "Analyze a local image file with a Gemini vision model and return text an LLM without vision can use.",
    inputSchema: {
      image_path: z
        .string()
        .min(1)
        .describe("Local image filesystem path. Relative paths resolve from the MCP server working directory."),
      question: z
        .string()
        .optional()
        .describe("Optional specific question to answer about the image."),
      mode: z
        .enum(analysisModes)
        .optional()
        .default("general")
        .describe("Analysis mode: general, ocr, objects, or accessibility."),
      detail: z
        .enum(analysisDetails)
        .optional()
        .default("normal")
        .describe("Response detail level: brief, normal, or detailed."),
    },
  },
  async (args) => {
    try {
      return await handleAnalyzeImage(
        {
          image_path: args.image_path,
          question: args.question,
          mode: args.mode,
          detail: args.detail,
        },
        {
          analyzer: getAnalyzer(),
        },
      );
    } catch (error) {
      return createAnalyzeImageErrorResult(error);
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Image Understanding MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in Image Understanding MCP server:", error);
  process.exit(1);
});
