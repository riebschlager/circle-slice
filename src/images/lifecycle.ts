import {
  decodeImageFile,
  classifyDecodeError,
  decodeErrorMessage,
  type DecodeResult,
  type DecodedImage,
  resizePreview,
} from './decode';
import { LIMITS, sourceArtworkSize } from '../render/sizing';
import type { Size } from '../render/geometry';

/** A monotonically-increasing counter for import requests. */
let nextRequestId = 1;
export function allocateRequestId(): number {
  return nextRequestId++;
}

export interface ImportSuccess {
  requestId: number;
  bitmap: DecodedImage;
  sourceSize: Size;
  artwork: Size;
  /** Original file, kept for export; null for the bundled example. */
  file: File | null;
  sourceBlob?: Blob | undefined;
}

export interface ImportFailure {
  requestId: number;
  message: string;
}

export type ImportOutcome =
  ({ ok: true } & ImportSuccess) | ({ ok: false } & ImportFailure);

/**
 * Load and decode one image file.
 * Returns null when the result was superseded by a later request
 * (i.e. latestRequestId < requestId at the time of resolution).
 *
 * The caller is responsible for calling `close()` on the returned bitmap
 * when it is no longer needed.
 */
export async function importFile(
  file: File,
  requestId: number,
  isLatest: () => boolean,
): Promise<ImportOutcome | null> {
  let result: DecodeResult;
  try {
    result = await decodeImageFile(file);
  } catch (err) {
    if (!isLatest()) return null;
    const kind = classifyDecodeError(err);
    return {
      ok: false,
      requestId,
      message: decodeErrorMessage(kind, file),
    };
  }
  if (!isLatest()) {
    result.bitmap.close();
    return null;
  }
  // Keep the complete source bounds in a bounded preview; export decodes the File.
  if (result.bitmap.width * result.bitmap.height > LIMITS.previewPixels) {
    const scale = Math.sqrt(
      LIMITS.previewPixels / result.bitmap.width / result.bitmap.height,
    );
    const full = result.bitmap;
    try {
      result.bitmap = await resizePreview(
        full,
        Math.max(1, Math.floor(full.width * scale)),
        Math.max(1, Math.floor(full.height * scale)),
      );
    } catch {
      if (!isLatest()) return null;
      return {
        ok: false,
        requestId,
        message: 'Could not prepare the preview. Try a smaller image.',
      };
    } finally {
      full.close();
    }
    if (!isLatest()) {
      result.bitmap.close();
      return null;
    }
  }
  const artwork = sourceArtworkSize(result.sourceSize);
  return {
    ok: true,
    requestId,
    bitmap: result.bitmap,
    sourceSize: result.sourceSize,
    artwork,
    file,
  };
}

/**
 * Load the bundled example image from a URL.
 * Returns null if superseded. On failure, the caller should degrade gracefully
 * but still allow local import.
 */
export async function importExample(
  url: string,
  requestId: number,
  isLatest: () => boolean,
): Promise<ImportOutcome | null> {
  let bitmap: DecodedImage;
  let sourceSize: Size;
  let sourceBlob: Blob;
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Fetch failed: ${response.status.toString()}`);
    const blob = await response.blob();
    sourceBlob = blob;
    if (!isLatest()) return null;
    const result = await decodeImageFile(
      new File([blob], 'example.png', { type: blob.type }),
    );
    bitmap = result.bitmap;
    sourceSize = result.sourceSize;
  } catch {
    if (!isLatest()) return null;
    const fakeFile = { name: 'example' } as File;
    return {
      ok: false,
      requestId,
      message: decodeErrorMessage('unknown', fakeFile),
    };
  }
  if (!isLatest()) {
    bitmap.close();
    return null;
  }
  const artwork = sourceArtworkSize(sourceSize);
  return {
    ok: true,
    requestId,
    bitmap,
    sourceSize,
    artwork,
    file: null,
    sourceBlob,
  };
}
