import { stat } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_INLINE_IMAGE_BYTE_LIMIT = 18 * 1024 * 1024;
export const DEFAULT_MAX_IMAGE_BYTES = 100 * 1024 * 1024;

const MIME_BY_EXTENSION = new Map<string, string>([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".bmp", "image/bmp"],
  [".heic", "image/heic"],
  [".heif", "image/heif"],
]);

export interface LoadedImage {
  originalPath: string;
  absolutePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface LoadImageOptions {
  cwd?: string;
  maxBytes?: number;
}

export class ImageInputError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ImageInputError";
  }
}

export function detectImageMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = MIME_BY_EXTENSION.get(extension);

  if (!mimeType) {
    throw new ImageInputError(
      `Unsupported image type "${extension || "(none)"}". Supported extensions: ${[
        ...MIME_BY_EXTENSION.keys(),
      ].join(", ")}.`,
      "UNSUPPORTED_IMAGE_TYPE",
    );
  }

  return mimeType;
}

export function resolveLocalImagePath(imagePath: string, cwd = process.cwd()): string {
  const trimmedPath = imagePath.trim();

  if (!trimmedPath) {
    throw new ImageInputError("image_path is required.", "EMPTY_IMAGE_PATH");
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedPath) && !/^[a-z]:[\\/]/i.test(trimmedPath)) {
    throw new ImageInputError(
      "Only local filesystem paths are supported. URLs and data URIs are not accepted in v1.",
      "REMOTE_IMAGE_NOT_SUPPORTED",
    );
  }

  return path.resolve(cwd, trimmedPath);
}

export async function loadImageInput(
  imagePath: string,
  options: LoadImageOptions = {},
): Promise<LoadedImage> {
  const absolutePath = resolveLocalImagePath(imagePath, options.cwd);
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const mimeType = detectImageMimeType(absolutePath);

  let stats;
  try {
    stats = await stat(absolutePath);
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === "ENOENT") {
      throw new ImageInputError(`Image file does not exist: ${absolutePath}`, "IMAGE_NOT_FOUND");
    }

    throw new ImageInputError(`Unable to inspect image file: ${absolutePath}`, "IMAGE_STAT_FAILED");
  }

  if (!stats.isFile()) {
    throw new ImageInputError(`Image path is not a file: ${absolutePath}`, "IMAGE_NOT_FILE");
  }

  if (stats.size <= 0) {
    throw new ImageInputError(`Image file is empty: ${absolutePath}`, "IMAGE_EMPTY");
  }

  if (stats.size > maxBytes) {
    throw new ImageInputError(
      `Image file is too large: ${stats.size} bytes. Maximum allowed size is ${maxBytes} bytes.`,
      "IMAGE_TOO_LARGE",
    );
  }

  return {
    originalPath: imagePath,
    absolutePath,
    mimeType,
    sizeBytes: stats.size,
  };
}

export function parsePositiveIntegerEnv(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
