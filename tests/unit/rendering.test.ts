import { expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../../src/state/settings';
import { ringGeometry } from '../../src/render/classic';
import {
  assertArtworkSize,
  LIMITS,
  previewSurface,
  sourceArtworkSize,
} from '../../src/render/sizing';

it('normalizes finite settings and preserves last valid values for invalid commits', () => {
  expect(normalizeSettings({ slices: 3.7, rotation: 12.34 })).toEqual({
    slices: 4,
    rotation: 12.3,
  });
  expect(normalizeSettings({ slices: 99, rotation: -90 })).toEqual({
    slices: 50,
    rotation: -50,
  });
  expect(normalizeSettings({ slices: -2, rotation: 90 })).toEqual({
    slices: 1,
    rotation: 50,
  });
  expect(normalizeSettings({ slices: NaN, rotation: Infinity })).toEqual(
    DEFAULT_SETTINGS,
  );
  expect(
    normalizeSettings({ rotation: NaN }, { slices: 8, rotation: -3 }),
  ).toEqual({ slices: 8, rotation: -3 });
});

it('orders circles from height/2 inward with the first rotation already applied', () => {
  const rings = ringGeometry(640, 10, -35);
  expect(rings[0]).toEqual({ radius: 320, angle: (-35 * Math.PI) / 180 });
  expect(rings.at(-1)!.radius).toBe(32);
  expect(rings.at(-1)!.angle).toBeCloseTo((-350 * Math.PI) / 180);
  expect(ringGeometry(640, 1, 0)).toEqual([{ radius: 320, angle: 0 }]);
});

it('source artwork sizing never upscales and obeys both export limits', () => {
  expect(sourceArtworkSize({ width: 800, height: 600 })).toEqual({
    width: 800,
    height: 600,
  });
  for (const source of [
    { width: 12000, height: 12000 },
    { width: 12000, height: 2000 },
  ]) {
    const artwork = sourceArtworkSize(source);
    expect(() => assertArtworkSize(artwork)).not.toThrow();
    expect(artwork.width / artwork.height).toBeCloseTo(
      source.width / source.height,
      2,
    );
  }
  for (const width of [NaN, 0, -1, Infinity, 8193, 1.5])
    expect(() => assertArtworkSize({ width, height: 500 })).toThrow();
});

it('caps DPR and pixels and uniformly fits rounded backing dimensions', () => {
  const artwork = { width: 801, height: 603 };
  for (const dpr of [1, 1.25, 2, 3]) {
    for (const box of [
      { width: 321, height: 241 },
      { width: 9000, height: 9000 },
    ]) {
      const surface = previewSurface(artwork, box, dpr);
      expect(surface.width * surface.height).toBeLessThanOrEqual(
        LIMITS.previewPixels,
      );
      expect(surface.scale * artwork.width + surface.x * 2).toBeCloseTo(
        surface.width,
      );
      expect(surface.scale * artwork.height + surface.y * 2).toBeCloseTo(
        surface.height,
      );
      expect(Math.min(surface.x, surface.y)).toBe(0);
    }
  }
  expect(previewSurface(artwork, artwork, 3)).toEqual(
    previewSurface(artwork, artwork, 2),
  );
});
