import {
  decodeImageFile,
  classifyDecodeError,
  decodeErrorMessage,
  type DecodeResult,
} from './decode';
import { sourceArtworkSize } from '../render/sizing';
import type { Size } from '../render/geometry';

/** A monotonically-increasing counter for import requests. */
let nextRequestId = 1;
export function allocateRequestId(): number {
  return nextRequestId++;
}

export interface ImportSuccess {
  requestId: number;
  bitmap: ImageBitmap;
  sourceSize: Size;
  artwork: Size;
  /** Original file, kept for export; null for the bundled example. */
  file: File | null;
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
  let bitmap: ImageBitmap;
  let sourceSize: Size;
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Fetch failed: ${response.status.toString()}`);
    const blob = await response.blob();
    if (!isLatest()) return null;
    bitmap = await createImageBitmap(blob, {
      resizeQuality: 'high',
      imageOrientation: 'from-image',
    });
    sourceSize = { width: bitmap.width, height: bitmap.height };
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
  };
}
