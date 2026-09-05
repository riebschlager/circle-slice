import type { Size } from './geometry';

export const LIMITS = Object.freeze({
  inputBytes: 30 * 1024 * 1024,
  inputPixels: 40_000_000,
  inputAxis: 12_000,
  artworkPixels: 16_000_000,
  artworkAxis: 8192,
  previewPixels: 2_000_000,
  previewDpr: 2,
});

export function assertSize(size: Size) {
  if (![size.width, size.height].every((n) => Number.isFinite(n) && n > 0))
    throw new RangeError('Dimensions must be finite and positive');
}

export function sourceArtworkSize(source: Size): Size {
  assertSize(source);
  const scale = Math.min(
    1,
    LIMITS.artworkAxis / source.width,
    LIMITS.artworkAxis / source.height,
    Math.sqrt(LIMITS.artworkPixels / source.width / source.height),
  );
  return {
    width: Math.max(1, Math.floor(source.width * scale)),
    height: Math.max(1, Math.floor(source.height * scale)),
  };
}

export function assertArtworkSize(size: Size) {
  assertSize(size);
  if (
    !Number.isInteger(size.width) ||
    !Number.isInteger(size.height) ||
    Math.max(size.width, size.height) > LIMITS.artworkAxis ||
    size.width * size.height > LIMITS.artworkPixels
  )
    throw new RangeError(
      'Artwork exceeds pixel limits or has fractional dimensions',
    );
}

/** Round backing pixels down, then uniformly contain the artwork in that surface. */
export function previewSurface(artwork: Size, box: Size, dpr: number) {
  assertArtworkSize(artwork);
  assertSize(box);
  const density =
    Number.isFinite(dpr) && dpr > 0 ? Math.min(dpr, LIMITS.previewDpr) : 1;
  const desired =
    Math.min(box.width / artwork.width, box.height / artwork.height) * density;
  const bounded = Math.min(
    desired,
    Math.sqrt(LIMITS.previewPixels / artwork.width / artwork.height),
  );
  const width = Math.max(1, Math.floor(artwork.width * bounded));
  const height = Math.max(1, Math.floor(artwork.height * bounded));
  const scale = Math.min(width / artwork.width, height / artwork.height);
  return {
    width,
    height,
    scale,
    x: (width - artwork.width * scale) / 2,
    y: (height - artwork.height * scale) / 2,
  };
}
