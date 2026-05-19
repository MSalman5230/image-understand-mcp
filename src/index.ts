#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { createAnalyzeImageErrorResult, handleAnalyzeImage } from "./analyzeImageTool.js";
import {
  analysisDetails,
  analysisModes,
  createGoogleVisionAnalyzerFromEnv,
  type ImageAnalysisDetail,
  type ImageAnalysisMode,
  type VisionAnalyzer,
} from "./googleVision.js";

const server = new McpServer({
  name: "image-understanding",
  version: "0.1.0",
});

let analyzer: VisionAnalyzer | undefined;

function getAnalyzer(): VisionAnalyzer {
  analyzer ??= createGoogleVisionAnalyzerFromEnv();
  return analyzer;
}

const imageToolInputSchema = {
  image_path: z
    .string()
    .min(1)
    .describe(
      "Required local filesystem path to the image, screenshot, photo, diagram, chart, receipt, or attached image file. Use the path shown by the client for an image attachment. Relative paths resolve from the MCP server working directory.",
    ),
  question: z
    .string()
    .optional()
    .describe(
      "The user's exact question about the image. Examples: 'what is this image?', 'read the text', 'describe the chart', or 'what UI bug is visible?'.",
    ),
  mode: z
    .enum(analysisModes)
    .optional()
    .default("general")
    .describe(
      "Choose general for normal image questions, ocr for reading text, objects for identifying/counting things, accessibility for alt text, or extreme_detail to describe everything visible in the image.",
    ),
  detail: z
    .enum(analysisDetails)
    .optional()
    .default("normal")
    .describe("Response detail level: brief, normal, or detailed."),
};

const analyzeImageDescription =
  "Use this tool whenever the user asks about an image, screenshot, photo, diagram, chart, UI screenshot, receipt, or image attachment and provides or references a local file path. This is the vision bridge for agents that cannot see images directly: pass the local image path and the user's question, then answer from the returned analysis.";

async function runAnalyzeImageTool(args: {
  image_path: string;
  question?: string;
  mode?: ImageAnalysisMode;
  detail?: ImageAnalysisDetail;
}) {
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
}

server.registerTool(
  "analyze_image",
  {
    title: "Analyze Image",
    description: analyzeImageDescription,
    inputSchema: imageToolInputSchema,
  },
  runAnalyzeImageTool,
);

server.registerTool(
  "describe_image",
  {
    title: "Describe Image",
    description:
      "Use this tool for common requests like 'what is this image?', 'describe this screenshot', 'what is shown here?', or 'look at this image'. It analyzes a local image path with Gemini vision and returns text the agent can use. This is an alias of analyze_image for better tool discovery.",
    inputSchema: {
      ...imageToolInputSchema,
      mode: imageToolInputSchema.mode.describe(
        "Choose general for normal image descriptions, ocr for reading text, objects for identifying/counting things, accessibility for alt text, or extreme_detail to describe everything visible in the image.",
      ),
    },
  },
  runAnalyzeImageTool,
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
