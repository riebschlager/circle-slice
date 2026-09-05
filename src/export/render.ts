/**
 * Render the Classic effect to a dedicated export canvas and encode it as a Blob.
 *
 * The caller provides an immutable snapshot of source, settings, and artwork;
 * this module does not read the DOM, schedule frames, or touch React state.
 */

import { renderClassic } from '../render/classic';
import type { RenderInput } from '../render/classic';
import type { ExportFormat } from './filename';
import { assertArtworkSize } from '../render/sizing';

export interface ExportOptions {
  input: RenderInput;
  format: ExportFormat;
  /** 0–1, only used for JPEG. Default 0.92. */
  quality?: number;
}

export interface ExportResult {
  blob: Blob;
  /** The actual MIME type returned by the browser's encoder. */
  mimeType: string;
}

/**
 * Render and encode the artwork to a Blob.
 *
 * Throws if the canvas cannot be created, toBlob returns null, or the
 * returned MIME type disagrees with the requested format.
 */
export async function renderExport(
  options: ExportOptions,
): Promise<ExportResult> {
  const { input, format } = options;
  const quality = options.quality ?? 0.92;

  assertArtworkSize(input.artwork);

  const { width, height } = input.artwork;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D rendering context is unavailable');
    renderClassic(ctx, input, { scale: 1, x: 0, y: 0 });

    // Flatten the completed artwork; Classic clears its context before drawing.
    if (format === 'jpeg') {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      try {
        canvas.toBlob(resolve, mimeType, quality);
      } catch (error) {
        reject(error);
      }
    });
    if (!blob || blob.size === 0 || blob.type !== mimeType) {
      throw new Error(
        `Failed to encode the artwork as ${format.toUpperCase()}. Try a different format or smaller dimensions.`,
      );
    }
    return { blob, mimeType: blob.type };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
