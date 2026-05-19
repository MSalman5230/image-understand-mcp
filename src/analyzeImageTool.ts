import {
  DEFAULT_MAX_IMAGE_BYTES,
  ImageInputError,
  loadImageInput,
  parsePositiveIntegerEnv,
  type LoadedImage,
} from "./imageInput.js";
import {
  buildAnalysisPrompt,
  type ImageAnalysisDetail,
  type ImageAnalysisMode,
  type VisionAnalyzer,
} from "./googleVision.js";

export interface AnalyzeImageArgs {
  image_path: string;
  question?: string;
  mode?: ImageAnalysisMode;
  detail?: ImageAnalysisDetail;
}

export interface AnalyzeImageToolDeps {
  analyzer: VisionAnalyzer;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  maxImageBytes?: number;
}

export interface AnalyzeImageStructuredContent {
  [key: string]: unknown;
  backend: "gemini";
  model: string;
  image_path: string;
  mime_type: string;
  size_bytes: number;
  mode: ImageAnalysisMode;
  detail: ImageAnalysisDetail;
  prompt: string;
  analysis: string;
}

export interface AnalyzeImageErrorContent {
  [key: string]: unknown;
  error: string;
  code?: string;
}

export type AnalyzeImageToolResult =
  | {
      content: [{ type: "text"; text: string }];
      structuredContent: AnalyzeImageStructuredContent;
    }
  | {
      isError: true;
      content: [{ type: "text"; text: string }];
      structuredContent: AnalyzeImageErrorContent;
    };

export async function handleAnalyzeImage(
  args: AnalyzeImageArgs,
  deps: AnalyzeImageToolDeps,
): Promise<AnalyzeImageToolResult> {
  const mode = args.mode ?? "general";
  const detail = args.detail ?? "normal";
  const maxImageBytes =
    deps.maxImageBytes ??
    parsePositiveIntegerEnv(deps.env?.IMAGE_UNDERSTANDING_MAX_IMAGE_BYTES, DEFAULT_MAX_IMAGE_BYTES);

  try {
    const image = await loadImageInput(args.image_path, {
      cwd: deps.cwd,
      maxBytes: maxImageBytes,
    });
    const prompt = buildAnalysisPrompt({
      mode,
      detail,
      question: args.question,
    });
    const analysis = await deps.analyzer.analyze(image, prompt);
    const structuredContent = toStructuredContent({
      image,
      analyzer: deps.analyzer,
      mode,
      detail,
      prompt,
      analysis,
    });

    return {
      content: [
        {
          type: "text",
          text: formatAnalysisResult(structuredContent),
        },
      ],
      structuredContent,
    };
  } catch (error) {
    return createAnalyzeImageErrorResult(error);
  }
}

function toStructuredContent(input: {
  image: LoadedImage;
  analyzer: VisionAnalyzer;
  mode: ImageAnalysisMode;
  detail: ImageAnalysisDetail;
  prompt: string;
  analysis: string;
}): AnalyzeImageStructuredContent {
  return {
    backend: "gemini",
    model: input.analyzer.model,
    image_path: input.image.absolutePath,
    mime_type: input.image.mimeType,
    size_bytes: input.image.sizeBytes,
    mode: input.mode,
    detail: input.detail,
    prompt: input.prompt,
    analysis: input.analysis,
  };
}

function formatAnalysisResult(result: AnalyzeImageStructuredContent): string {
  return [
    `Model: ${result.model}`,
    `Image: ${result.image_path}`,
    `MIME type: ${result.mime_type}`,
    `Size: ${result.size_bytes} bytes`,
    `Mode: ${result.mode}`,
    "",
    result.analysis,
  ].join("\n");
}

export function createAnalyzeImageErrorResult(error: unknown): AnalyzeImageToolResult {
  const message = error instanceof Error ? error.message : "Unknown image analysis error.";
  const code = error instanceof ImageInputError ? error.code : undefined;
  const prefix = code ? `${code}: ` : "";

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `${prefix}${message}`,
      },
    ],
    structuredContent: {
      error: message,
      code,
    },
  };
}
