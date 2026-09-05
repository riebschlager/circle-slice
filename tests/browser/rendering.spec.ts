import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import manifest from '../reference/manifest.json' with { type: 'json' };

// Serve test-only TS modules through interception; production has no test entry.
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
}

for (const source of ['sea', 'quadrants', 'portrait', 'transparent']) {
  test(`Classic matches all 27 frozen ${source} references`, async ({
    page,
  }) => {
    await modules(page);
    await page.goto('./');
    const sourceBytes = await readFile(
      source === 'sea' ? 'img/sea.jpg' : `tests/fixtures/${source}.png`,
    );
    for (const entry of manifest.cases.filter(
      (entry) => entry.source === source,
    )) {
      const baseline = await readFile(
        `tests/reference/baselines/${entry.id}.png`,
      );
      const result = await page.evaluate(
        async ({ entry, sourceURL, baselineURL }) => {
          const moduleURL = './__test/render/classic.ts';
          const { renderClassic } = await import(/* @vite-ignore */ moduleURL);
          const image = new Image();
          image.src = sourceURL;
          await image.decode();
          const expected = new Image();
          expected.src = baselineURL;
          await expected.decode();
          const canvas = document.createElement('canvas');
          canvas.width = entry.width;
          canvas.height = entry.height;
          const ctx = canvas.getContext('2d')!;
          renderClassic(ctx, {
            source: image,
            sourceSize: {
              width: image.naturalWidth,
              height: image.naturalHeight,
            },
            artwork: { width: entry.width, height: entry.height },
            settings: { slices: entry.steps, rotation: entry.rotate },
          });
          const actual = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(expected, 0, 0);
          const reference = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          ).data;
          let different = 0;
          let maxDelta = 0;
          for (let i = 0; i < actual.length; i++) {
            const delta = Math.abs(actual[i]! - reference[i]!);
            if (delta) different++;
            maxDelta = Math.max(maxDelta, delta);
          }
          return { different, maxDelta };
        },
        {
          entry,
          sourceURL: `data:image/${source === 'sea' ? 'jpeg' : 'png'};base64,${sourceBytes.toString('base64')}`,
          baselineURL: `data:image/png;base64,${baseline.toString('base64')}`,
        },
      );
      expect(result, entry.id).toEqual({ different: 0, maxDelta: 0 });
    }
  });
}

test('preview coalesces updates, stays idle, and cleans up repeated lifetimes', async ({
  page,
}) => {
  await modules(page);
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Classic');
  const results = await page.evaluate(async () => {
    const moduleURL = './__test/render/preview.ts';
    const { createPreview } = await import(/* @vite-ignore */ moduleURL);
    const pause = () => new Promise((resolve) => setTimeout(resolve, 80));
    const nativeRequest = window.requestAnimationFrame;
    const nativeCancel = window.cancelAnimationFrame;
    let executed = 0;
    let peak = 0;
    const pending = new Set<number>();
    window.requestAnimationFrame = (callback) => {
      const id = nativeRequest.call(window, (time) => {
        pending.delete(id);
        executed++;
        callback(time);
      });
      pending.add(id);
      peak = Math.max(peak, pending.size);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      pending.delete(id);
      nativeCancel.call(window, id);
    };
    const box = document.createElement('div');
    box.style.cssText = 'width:400px;height:300px';
    document.body.append(box);
    const canvas = document.createElement('canvas');
    box.append(canvas);
    const source = document.createElement('canvas');
    source.width = 800;
    source.height = 600;
    source.getContext('2d')!.fillRect(0, 0, 800, 600);
    const input = {
      source,
      sourceSize: { width: 800, height: 600 },
      artwork: { width: 800, height: 600 },
      settings: { slices: 10, rotation: 10 },
    };
    let idle = true;
    let stable = true;
    let latest = true;
    for (let i = 0; i < 6; i++) {
      const preview = createPreview(canvas, box);
      for (let n = 1; n <= 50; n++)
        preview.update({ ...input, settings: { slices: n, rotation: -35 } });
      // Last source replaces all preceding work before the single pending draw.
      const transparent = document.createElement('canvas');
      transparent.width = 800;
      transparent.height = 600;
      preview.update({ ...input, source: transparent });
      await pause();
      latest &&=
        canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 64;
      const count = executed;
      await pause();
      idle &&= executed === count;
      box.style.width = `${401 + i}px`;
      await pause();
      stable &&= input.artwork.width === 800 && input.artwork.height === 600;
      preview.update(input);
      preview.dispose();
      preview.update(input);
      const afterDispose = executed;
      await pause();
      idle &&= executed === afterDispose;
    }
    box.remove();
    window.requestAnimationFrame = nativeRequest;
    window.cancelAnimationFrame = nativeCancel;
    return {
      idle,
      stable,
      latest,
      peak,
      pending: pending.size,
      width: canvas.width,
      height: canvas.height,
    };
  });
  expect(results).toEqual({
    idle: true,
    stable: true,
    latest: true,
    peak: 1,
    pending: 0,
    width: 0,
    height: 0,
  });
});

test('viewport and DPR change only preview resolution, preserving the composition', async ({
  page,
}) => {
  await modules(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('800 × 600');
  const canvas = page.locator('canvas');
  await expect
    .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width))
    .toBeGreaterThan(1);
  const initial = await canvas.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await page.screenshot({
    path: 'test-results/m2-desktop.png',
    fullPage: true,
  });
  const session = await page.context().newCDPSession(page);
  for (const density of [1.25, 2, 3]) {
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 700,
      deviceScaleFactor: density,
      mobile: false,
    });
    // CDP density changes need a paint before Chromium dispatches media-query changes.
    await page.screenshot();
    await page.waitForTimeout(100);
    const check = await canvas.evaluate(async (c: HTMLCanvasElement) => {
      const classicURL = './__test/render/classic.ts';
      const sizingURL = './__test/render/sizing.ts';
      const { renderClassic } = await import(/* @vite-ignore */ classicURL);
      const { previewSurface } = await import(/* @vite-ignore */ sizingURL);
      const image = new Image();
      image.src = './examples/quadrants.png';
      await image.decode();
      const artwork = { width: 800, height: 600 };
      const surface = previewSurface(
        artwork,
        c.parentElement!.getBoundingClientRect(),
        window.devicePixelRatio,
      );
      const reference = document.createElement('canvas');
      reference.width = surface.width;
      reference.height = surface.height;
      renderClassic(
        reference.getContext('2d'),
        {
          source: image,
          sourceSize: artwork,
          artwork,
          settings: { slices: 10, rotation: 10 },
        },
        surface,
      );
      return {
        equal: reference.toDataURL() === c.toDataURL(),
        actual: [c.width, c.height],
        expected: [surface.width, surface.height],
        density: window.devicePixelRatio,
        pixels: c.width * c.height,
      };
    });
    expect(check.equal, JSON.stringify(check)).toBe(true);
    expect(check.pixels).toBeLessThanOrEqual(2_000_000);
    await expect(page.getByRole('status')).toContainText('800 × 600');
  }
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await expect
    .poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .toBe(initial);
  await session.detach();
  await page.setViewportSize({ width: 320, height: 700 });
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'test-results/m2-mobile.png', fullPage: true });
});
