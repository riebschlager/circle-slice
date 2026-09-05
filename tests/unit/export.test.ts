import { describe, expect, it } from 'vitest';
import { makeFilename } from '../../src/export/filename';

function fakeFile(name: string): File {
  return { name } as unknown as File;
}

describe('makeFilename', () => {
  it('produces the expected pattern for a PNG export', () => {
    const f = makeFilename(
      fakeFile('photo.jpg'),
      { width: 800, height: 600 },
      'png',
    );
    expect(f).toBe('photo-circle-slice-800x600.png');
  });

  it('produces a .jpg extension for JPEG exports', () => {
    const f = makeFilename(
      fakeFile('portrait.png'),
      { width: 1000, height: 1500 },
      'jpeg',
    );
    expect(f).toBe('portrait-circle-slice-1000x1500.jpg');
  });

  it('uses a neutral basename when sourceFile is null (bundled example)', () => {
    const f = makeFilename(null, { width: 480, height: 480 }, 'png');
    expect(f).toBe('circle-slice-example-circle-slice-480x480.png');
  });

  it('strips the source extension from the basename', () => {
    const f = makeFilename(
      fakeFile('my.image.jpeg'),
      { width: 200, height: 200 },
      'png',
    );
    expect(f).toBe('my.image-circle-slice-200x200.png');
  });

  it('replaces unsafe characters with dashes', () => {
    const f = makeFilename(
      fakeFile('my<photo>/weird?.png'),
      { width: 100, height: 100 },
      'png',
    );
    expect(f).not.toMatch(/[<>"'/\\|?*]/);
    expect(f).toMatch(/-circle-slice-100x100\.png$/);
  });

  it('collapses multiple dashes', () => {
    const f = makeFilename(
      fakeFile('a--b---c.png'),
      { width: 10, height: 10 },
      'png',
    );
    expect(f).toMatch(/^a-b-c-circle-slice/);
  });

  it('handles a filename that is only an extension', () => {
    const f = makeFilename(
      fakeFile('.hidden'),
      { width: 50, height: 50 },
      'png',
    );
    // basename becomes "image" (fallback after stripping)
    expect(f).toMatch(/-circle-slice-50x50\.png$/);
  });

  it('caps basename at 200 characters', () => {
    const longName = 'a'.repeat(250) + '.png';
    const f = makeFilename(
      fakeFile(longName),
      { width: 10, height: 10 },
      'png',
    );
    const parts = f.split('-circle-slice-');
    const basename = parts[0] ?? '';
    expect(basename.length).toBeLessThanOrEqual(200);
  });

  it('includes width×height in the filename', () => {
    const f = makeFilename(
      fakeFile('img.png'),
      { width: 1920, height: 1080 },
      'jpeg',
    );
    expect(f).toContain('1920x1080');
  });
});
