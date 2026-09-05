import { describe, expect, it } from 'vitest';
import { coverRect } from '../../src/render/geometry';

describe('centered cover geometry', () => {
  it.each([
    [
      { width: 800, height: 600 },
      { width: 400, height: 400 },
      { x: -200 / 3, y: 0, width: 1600 / 3, height: 400 },
    ],
    [
      { width: 400, height: 800 },
      { width: 640, height: 360 },
      { x: 0, y: -460, width: 640, height: 1280 },
    ],
    [
      { width: 600, height: 600 },
      { width: 360, height: 640 },
      { x: -140, y: 0, width: 640, height: 640 },
    ],
  ])(
    'preserves full image bounds for %j into %j',
    (source, artwork, expected) => {
      const actual = coverRect(source, artwork);
      expect(actual.x).toBeCloseTo(expected.x);
      expect(actual.y).toBeCloseTo(expected.y);
      expect(actual.width).toBeCloseTo(expected.width);
      expect(actual.height).toBeCloseTo(expected.height);
      expect(actual.width / actual.height).toBeCloseTo(
        source.width / source.height,
      );
    },
  );
  it.each([0, -1, NaN, Infinity])('rejects invalid dimensions: %s', (width) => {
    expect(() =>
      coverRect({ width, height: 600 }, { width: 400, height: 400 }),
    ).toThrow(RangeError);
  });
});
