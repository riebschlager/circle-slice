import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function modules(page: Page) {
  await page.route('**/__test/**', async (route) => {
    const path = new URL(route.request().url()).pathname.split('/__test/')[1]!;
    const source = await readFile(`src/${path}`, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2023,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText;
    await route.fulfill({
      contentType: 'text/javascript',
      body: output.replace(/from '([^']+)'/g, "from '$1.ts'"),
    });
  });
  await page.goto('./');
  await expect(page.getByRole('status').first()).toContainText('Classic');
}

test('JPEG flattens completed transparency onto white; PNG retains alpha', async ({
  page,
}) => {
  await modules(page);
  const pixels = await page.evaluate(async () => {
    const url = './__test/export/render.ts';
    const { renderExport } = await import(url);
    const source = document.createElement('canvas');
    source.width = source.height = 32;
    const input = {
      source,
      sourceSize: { width: 32, height: 32 },
      artwork: { width: 32, height: 32 },
      settings: { slices: 10, rotation: 10 },
    };
    const values = [];
    for (const format of ['png', 'jpeg']) {
      const { blob } = await renderExport({ input, format });
      const image = await createImageBitmap(blob);
      const out = document.createElement('canvas');
      out.width = out.height = 32;
      const ctx = out.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      values.push([...ctx.getImageData(0, 0, 1, 1).data]);
      image.close();
    }
    return values;
  });
  expect(pixels[0]![3]).toBe(64);
  expect(pixels[1]).toEqual([255, 255, 255, 255]);
});

test('wrong MIME and empty blobs reject and release canvases', async ({
  page,
}) => {
  await modules(page);
  const result = await page.evaluate(async () => {
    const url = './__test/export/render.ts';
    const { renderExport } = await import(url);
    const source = document.createElement('canvas');
    source.width = source.height = 32;
    const original = HTMLCanvasElement.prototype.toBlob;
    const canvases: HTMLCanvasElement[] = [];
    const errors: string[] = [];
    try {
      for (const bad of [
        new Blob(['x'], { type: 'image/png' }),
        new Blob([], { type: 'image/jpeg' }),
      ]) {
        HTMLCanvasElement.prototype.toBlob = function (cb) {
          canvases.push(this);
          cb(bad);
        };
        try {
          await renderExport({
            input: {
              source,
              sourceSize: { width: 32, height: 32 },
              artwork: { width: 32, height: 32 },
              settings: { slices: 10, rotation: 10 },
            },
            format: 'jpeg',
          });
        } catch (e) {
          errors.push(String(e));
        }
      }
    } finally {
      HTMLCanvasElement.prototype.toBlob = original;
    }
    return { errors, sizes: canvases.map((c) => [c.width, c.height]) };
  });
  expect(result.errors).toHaveLength(2);
  expect(result.sizes).toEqual([
    [0, 0],
    [0, 0],
  ]);
});

test('Escape cancels numeric edits, Custom selects, ratios link, invalid errors persist', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Classic');
  const slices = page.getByRole('spinbutton', { name: 'Slices' });
  await slices.fill('27');
  await slices.press('Escape');
  await expect(slices).toHaveValue('10');
  const width = page.getByLabel('Artwork width in pixels');
  const height = page.getByLabel('Artwork height in pixels');
  await width.fill('123');
  await width.press('Escape');
  await expect(width).toHaveValue('800');
  await page.getByText('1∶1', { exact: true }).click();
  await width.fill('400');
  await width.press('Enter');
  await expect(height).toHaveValue('400');
  await page.getByText('Custom', { exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Custom' })).toBeChecked();
  await width.fill('300');
  await width.press('Enter');
  await expect(height).toHaveValue('400');
  await width.fill('12.5');
  await width.press('Enter');
  await expect(width).toHaveValue('300');
  await page.waitForTimeout(2700);
  await expect(width).toHaveAttribute('aria-invalid', 'true');
  await page.getByText('Source', { exact: true }).click();
  await expect(width).toHaveValue('400');
  await expect(height).toHaveValue('300');
});

test('image-element fallback works without createImageBitmap and exports', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'createImageBitmap', {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Classic');
  await page
    .locator('input[type=file]')
    .setInputFiles('tests/fixtures/portrait.png');
  await expect(page.locator('.fig-filename')).toHaveText('portrait.png');
  const download = page.waitForEvent('download');
  await page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Download' })
    .click();
  expect((await download).suggestedFilename()).toContain('portrait');
  await expect(
    page.getByRole('link', { name: 'Download again' }),
  ).toBeVisible();
});

test('picker supersedes a stalled bundled example', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/examples/quadrants.png', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('./');
  const open = page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Open image' });
  await expect(open).toBeEnabled();
  const chooser = page.waitForEvent('filechooser');
  await open.click();
  await (await chooser).setFiles('tests/fixtures/portrait.png');
  await expect(page.locator('.fig-filename')).toHaveText('portrait.png');
  release();
  await expect(page.getByRole('status')).toContainText('Classic');
});

test('bounded preview releases full image and exports original detail', async ({
  page,
}) => {
  await modules(page);
  const result = await page.evaluate(async () => {
    const importURL = './__test/images/lifecycle.ts';
    const decodeURL = './__test/images/decode.ts';
    const { importFile } = await import(importURL);
    const { decodeImageFile } = await import(decodeURL);
    const exportURL = './__test/export/render.ts';
    const { renderExport } = await import(exportURL);
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d')!;
    for (let x = 0; x < canvas.width; x++) {
      ctx.fillStyle = x % 2 ? 'white' : 'black';
      ctx.fillRect(x, 0, 1, canvas.height);
    }
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!)),
    );
    const file = new File([blob], 'detail.png', { type: 'image/png' });
    const preview = await importFile(file, 1, () => true);
    const full = await decodeImageFile(file);
    const exported = await renderExport({
      input: {
        source: full.bitmap,
        sourceSize: full.sourceSize,
        artwork: full.sourceSize,
        settings: { slices: 1, rotation: 0 },
      },
      format: 'png',
    });
    const exportedImage = await createImageBitmap(exported.blob);
    ctx.drawImage(exportedImage, 0, 0);
    const pixel = [...ctx.getImageData(1000, 600, 2, 1).data];
    exportedImage.close();
    const answer = {
      pixel,
      previewPixels: preview.bitmap.width * preview.bitmap.height,
      source: preview.sourceSize,
      full: [full.bitmap.width, full.bitmap.height],
    };
    preview.bitmap.close();
    full.bitmap.close();
    return answer;
  });
  expect(result.pixel).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  expect(result.previewPixels).toBeLessThanOrEqual(2_000_000);
  expect(result.source).toEqual({ width: 2000, height: 1200 });
  expect(result.full).toEqual([2000, 1200]);
});

test('spoofed unsupported format is rejected despite accepted MIME', async ({
  page,
}) => {
  await modules(page);
  const error = await page.evaluate(async () => {
    const url = './__test/images/decode.ts';
    const { decodeImageFile, classifyDecodeError } = await import(url);
    try {
      await decodeImageFile(
        new File(
          ['<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"/>'],
          'fake.png',
          { type: 'image/png' },
        ),
      );
    } catch (e) {
      return classifyDecodeError(e);
    }
  });
  expect(error).toBe('unsupported-format');
});

test('editor passes automated WCAG AA checks on desktop and narrow layouts', async ({
  page,
}) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Classic');
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});

test('EXIF orientation is applied once in primary and image-element decoders', async ({
  page,
}) => {
  await modules(page);
  const result = await page.evaluate(async () => {
    const url = './__test/images/decode.ts';
    const { decodeImageFile } = await import(url);
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 20;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 20, 20);
    ctx.fillStyle = 'blue';
    ctx.fillRect(20, 0, 20, 20);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 1),
    );
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    // APP1 Exif, little-endian TIFF, one orientation tag = 6 (90 degrees clockwise).
    const exif = new Uint8Array([
      255, 225, 0, 34, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0, 1, 0,
      18, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const file = new File(
      [jpeg.slice(0, 2), exif, jpeg.slice(2)],
      'oriented.jpg',
      { type: 'image/jpeg' },
    );
    const original = window.createImageBitmap;
    const results = [];
    try {
      for (const fallback of [false, true]) {
        if (fallback)
          window.createImageBitmap = () =>
            Promise.reject(new Error('force fallback'));
        const decoded = await decodeImageFile(file);
        canvas.width = 20;
        canvas.height = 40;
        ctx.drawImage(decoded.bitmap, 0, 0);
        results.push({
          size: decoded.sourceSize,
          top: [...ctx.getImageData(10, 5, 1, 1).data],
          bottom: [...ctx.getImageData(10, 35, 1, 1).data],
        });
        decoded.bitmap.close();
      }
    } finally {
      window.createImageBitmap = original;
    }
    return results;
  });
  for (const decoded of result) {
    expect(decoded.size).toEqual({ width: 20, height: 40 });
    expect(decoded.top[0]).toBeGreaterThan(240);
    expect(decoded.top[2]).toBeLessThan(15);
    expect(decoded.bottom[2]).toBeGreaterThan(240);
    expect(decoded.bottom[0]).toBeLessThan(15);
  }
});

test('export keeps original pixels and dimensions across a later image replacement', async ({
  page,
}) => {
  await modules(page);
  await page
    .locator('input[type=file]')
    .setInputFiles('tests/fixtures/quadrants.png');
  await expect(page.locator('.fig-filename')).toHaveText('quadrants.png');
  const before = page.waitForEvent('download');
  await page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Download' })
    .click();
  const beforePath = await (await before).path();
  const expected = await readFile(beforePath!);
  // Delay only the full-file decode started by the next export, leaving replacement free to finish.
  await page.evaluate(() => {
    const original = window.createImageBitmap;
    let first = true;
    window.createImageBitmap = ((
      ...args: Parameters<typeof createImageBitmap>
    ) => {
      if (first) {
        first = false;
        return new Promise<ImageBitmap>((resolve, reject) => {
          Object.assign(window, {
            releaseExport: () => original(...args).then(resolve, reject),
          });
        });
      }
      return original(...args);
    }) as typeof createImageBitmap;
  });
  const downloads: string[] = [];
  page.on('download', (d) => downloads.push(d.suggestedFilename()));
  await page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Download' })
    .click();
  await expect(
    page.getByRole('toolbar').getByRole('button', { name: 'Preparing…' }),
  ).toBeDisabled();
  await page
    .locator('input[type=file]')
    .setInputFiles('tests/fixtures/portrait.png');
  await expect(page.locator('.fig-filename')).toHaveText('portrait.png');
  const during = page.waitForEvent('download');
  await page.evaluate(() =>
    (window as unknown as { releaseExport(): void }).releaseExport(),
  );
  const actualDownload = await during;
  expect(actualDownload.suggestedFilename()).toContain(
    'quadrants-circle-slice-800x600',
  );
  const actual = await readFile((await actualDownload.path())!);
  expect(actual.equals(expected)).toBe(true);
  expect(downloads).toHaveLength(1);
});

test('late import A is disposed after B wins; repeated editor replacements retain one bitmap', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.createImageBitmap;
    const active = new Set<ImageBitmap>();
    Object.assign(window, { activeImages: () => active.size });
    window.createImageBitmap = ((
      ...args: Parameters<typeof createImageBitmap>
    ) => {
      const source = args[0];
      const decode = async () => {
        const bitmap = await original(...args);
        active.add(bitmap);
        const close = bitmap.close.bind(bitmap);
        bitmap.close = () => {
          active.delete(bitmap);
          close();
        };
        return bitmap;
      };
      if (source instanceof File && source.name === 'slow.png') {
        return new Promise<ImageBitmap>((resolve, reject) => {
          Object.assign(window, {
            releaseImport: () => decode().then(resolve, reject),
          });
        });
      }
      return decode();
    }) as typeof createImageBitmap;
  });
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Classic');
  await page.locator('input[type=file]').setInputFiles({
    name: 'slow.png',
    mimeType: 'image/png',
    buffer: await readFile('tests/fixtures/transparent.png'),
  });
  await page
    .locator('input[type=file]')
    .setInputFiles('tests/fixtures/portrait.png');
  await expect(page.locator('.fig-filename')).toHaveText('portrait.png');
  await page.evaluate(() =>
    (window as unknown as { releaseImport(): void }).releaseImport(),
  );
  for (let i = 0; i < 6; i++) {
    const name = i % 2 ? 'portrait.png' : 'quadrants.png';
    await page
      .locator('input[type=file]')
      .setInputFiles(`tests/fixtures/${name}`);
    await expect(page.locator('.fig-filename')).toHaveText(name);
    await expect
      .poll(() =>
        page.evaluate(() =>
          (window as unknown as { activeImages(): number }).activeImages(),
        ),
      )
      .toBe(1);
  }
});

test('WebP import and compressed, decoded-pixel, and axis limits are enforced', async ({
  page,
}) => {
  await modules(page);
  const result = await page.evaluate(async () => {
    const url = './__test/images/decode.ts';
    const { decodeImageFile, classifyDecodeError } = await import(url);
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 30;
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/webp'),
    );
    // Some engines do not encode WebP, so only run this roundtrip when supported.
    let webp = null;
    if (blob.type === 'image/webp') {
      const decoded = await decodeImageFile(
        new File([blob], 'image.webp', { type: blob.type }),
      );
      webp = decoded.sourceSize;
      decoded.bitmap.close();
    }
    const errors = [];
    try {
      await decodeImageFile(
        new File([new Uint8Array(30 * 1024 * 1024 + 1)], 'large.png'),
      );
    } catch (e) {
      errors.push(classifyDecodeError(e));
    }
    const original = window.createImageBitmap;
    let closed = 0;
    try {
      for (const [width, height] of [
        [12001, 1],
        [8000, 6000],
      ]) {
        window.createImageBitmap = () =>
          Promise.resolve({
            width,
            height,
            close() {
              closed++;
            },
          } as ImageBitmap);
        try {
          await decodeImageFile(
            new File(
              [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
              'dimensions.png',
            ),
          );
        } catch (e) {
          errors.push(classifyDecodeError(e));
        }
      }
    } finally {
      window.createImageBitmap = original;
    }
    return { webp, errors, closed };
  });
  if (result.webp) expect(result.webp).toEqual({ width: 40, height: 30 });
  expect(result.errors).toEqual([
    'too-large',
    'axis-too-long',
    'too-many-pixels',
  ]);
  expect(result.closed).toBe(2);
});

test('extreme portrait size stays bounded and text scaling reflows', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Classic');
  await page.setViewportSize({ width: 1280, height: 800 });
  if (testInfo.project.name === 'chromium')
    await page.screenshot({
      path: testInfo.outputPath('desktop.png'),
      fullPage: true,
    });
  await page.getByText('Custom', { exact: true }).click();
  await page.getByLabel('Artwork width in pixels').fill('1');
  await page.getByLabel('Artwork width in pixels').press('Enter');
  await page.getByLabel('Artwork height in pixels').fill('8192');
  await page.getByLabel('Artwork height in pixels').press('Enter');
  const box = await page.locator('.preview-surface').boundingBox();
  expect(box!.height).toBeLessThanOrEqual(600);
  await page
    .locator('input[type=file]')
    .setInputFiles('tests/fixtures/portrait.png');
  await expect(page.locator('.fig-filename')).toHaveText('portrait.png');
  await page.setViewportSize({ width: 320, height: 800 });
  if (testInfo.project.name === 'chromium')
    await page.screenshot({
      path: testInfo.outputPath('mobile.png'),
      fullPage: true,
    });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
