import { LIMITS } from '../render/sizing';
import type { Size } from '../render/geometry';

/** Accepted MIME types and their magic-byte signatures. */
const SIGNATURES: Array<{ mime: string; bytes: Uint8Array; offset?: number }> =
  [
    {
      mime: 'image/jpeg',
      bytes: new Uint8Array([0xff, 0xd8, 0xff]),
    },
    {
      mime: 'image/png',
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    },
    {
      mime: 'image/webp',
      bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46]),
      offset: 0,
      // WebP has "WEBP" at byte 8; we check just the RIFF header and rely on decode to reject other RIFF.
    },
  ];

const ACCEPTED_MIMES = new Set(SIGNATURES.map((s) => s.mime));

export type DecodeError =
  | 'too-large'
  | 'too-many-pixels'
  | 'axis-too-long'
  | 'unsupported-format'
  | 'corrupt'
  | 'unknown';

export interface DecodeResult {
  bitmap: ImageBitmap;
  sourceSize: Size;
}

/** Human-readable guidance for each error kind. */
export function decodeErrorMessage(error: DecodeError, file: File): string {
  switch (error) {
    case 'too-large':
      return `"${file.name}" is too large (max ${Math.round(LIMITS.inputBytes / 1024 / 1024)} MB). Please use a smaller file.`;
    case 'too-many-pixels':
      return `"${file.name}" has too many pixels (max ${(LIMITS.inputPixels / 1_000_000).toFixed(0)} MP decoded). Please use a smaller image.`;
    case 'axis-too-long':
      return `"${file.name}" has a side that exceeds ${LIMITS.inputAxis.toLocaleString()} pixels. Please use a smaller image.`;
    case 'unsupported-format':
      return `"${file.name}" is not a supported format. Please use a JPEG, PNG, or WebP file. HEIC/HEIF and RAW formats are not supported.`;
    case 'corrupt':
      return `"${file.name}" could not be decoded. The file may be corrupt or in an unsupported variant. Please try another file.`;
    default:
      return `"${file.name}" could not be loaded. Please try another file.`;
  }
}

function detectMime(header: Uint8Array): string | null {
  for (const sig of SIGNATURES) {
    const offset = sig.offset ?? 0;
    if (header.length < offset + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (header[offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return sig.mime;
  }
  return null;
}

/**
 * Validate, detect type, and decode a single image File.
 * Uses createImageBitmap (with orientation handling) and falls back to
 * HTMLImageElement + object URL if that throws or returns a 0-size bitmap.
 */
export async function decodeImageFile(file: File): Promise<DecodeResult> {
  if (file.size > LIMITS.inputBytes) throw mkErr('too-large');

  // Read just enough bytes for signature detection.
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detectedMime = detectMime(header);
  if (!detectedMime) {
    // Check file.type as a secondary signal before rejecting entirely.
    const normalizedType = file.type.toLowerCase().split(';')[0]!.trim();
    if (!ACCEPTED_MIMES.has(normalizedType)) throw mkErr('unsupported-format');
  }

  // Primary path: createImageBitmap with orientation-respecting options.
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, {
      resizeQuality: 'high',
      imageOrientation: 'from-image',
    });
  } catch {
    // Fall through to HTMLImageElement fallback.
  }

  // Fallback: HTMLImageElement + object URL with async decode.
  if (!bitmap || bitmap.width === 0 || bitmap.height === 0) {
    bitmap?.close();
    bitmap = await fallbackDecode(file);
  }

  const sourceSize = { width: bitmap.width, height: bitmap.height };

  if (
    sourceSize.width > LIMITS.inputAxis ||
    sourceSize.height > LIMITS.inputAxis
  ) {
    bitmap.close();
    throw mkErr('axis-too-long');
  }
  if (sourceSize.width * sourceSize.height > LIMITS.inputPixels) {
    bitmap.close();
    throw mkErr('too-many-pixels');
  }

  return { bitmap, sourceSize };
}

async function fallbackDecode(file: File): Promise<ImageBitmap> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (img.naturalWidth === 0 || img.naturalHeight === 0)
      throw mkErr('corrupt');
    return await createImageBitmap(img);
  } catch (err) {
    if (isDecodeErr(err)) throw err;
    throw mkErr('corrupt');
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface DecodeErrObj {
  __decodeError: DecodeError;
}

function mkErr(kind: DecodeError): DecodeErrObj {
  return { __decodeError: kind };
}

function isDecodeErr(e: unknown): e is DecodeErrObj {
  return typeof e === 'object' && e !== null && '__decodeError' in e;
}

export function classifyDecodeError(err: unknown): DecodeError {
  if (isDecodeErr(err)) return err.__decodeError;
  return 'unknown';
}
