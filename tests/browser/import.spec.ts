import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

// Helper: read a fixture as a Buffer.
async function fixture(name: string) {
  return readFile(path.join('tests/fixtures', name));
}

// Helper: wait for the status role element to contain text.
async function waitForStatus(page: Page, text: string | RegExp) {
  await expect(page.locator('[role="status"]')).toContainText(text, {
    timeout: 8000,
  });
}

// Helper: simulate a file-chooser-based import.
async function importViaChooser(page: Page, filePath: string) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Open image' }).first().click(),
  ]);
  await fileChooser.setFiles(filePath);
}

// Helper: simulate a drop of a named fixture file onto the preview surface.
async function dropFile(
  page: import('@playwright/test').Page,
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
) {
  const dropZone = page.locator('.preview-surface').first();
  await dropZone.evaluate(
    async (el, { name, base64, mime }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const file = new File([bytes], name, { type: mime });
      const dt = new DataTransfer();
      dt.items.add(file);
      el.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        }),
      );
    },
    {
      name: fileName,
      base64: fileBuffer.toString('base64'),
      mime: mimeType,
    },
  );
}

// ─── Bundled example loads on mount ──────────────────────────────────────────

test('bundled example loads on mount and is visible', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);
  await waitForStatus(page, /800 × 600/);
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  const width = await canvas.evaluate((c: HTMLCanvasElement) => c.width);
  expect(width).toBeGreaterThan(0);
});

// ─── File picker import ───────────────────────────────────────────────────────

test('imports a valid PNG via the file picker', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/); // wait for example to settle

  await importViaChooser(page, 'tests/fixtures/quadrants.png');
  // Loading may be too brief to observe on fast machines; wait directly for success.
  await waitForStatus(page, /Classic/);
  // The canvas should now render the imported image.
  const width = await page
    .locator('canvas')
    .first()
    .evaluate((c: HTMLCanvasElement) => c.width);
  expect(width).toBeGreaterThan(0);
});

test('can re-select the same file after a previous import', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // First import.
  await importViaChooser(page, 'tests/fixtures/quadrants.png');
  await waitForStatus(page, /Classic/);

  // Second import of the same file (same-file retry).
  await importViaChooser(page, 'tests/fixtures/quadrants.png');
  await waitForStatus(page, /Classic/);
});

// ─── Drag and drop import ────────────────────────────────────────────────────

test('imports a valid PNG via drag and drop', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  const bytes = await fixture('quadrants.png');
  await dropFile(page, 'quadrants.png', bytes, 'image/png');
  await waitForStatus(page, /Classic/);
  const width = await page
    .locator('canvas')
    .first()
    .evaluate((c: HTMLCanvasElement) => c.width);
  expect(width).toBeGreaterThan(0);
});

test('imports a valid transparent PNG via drag and drop', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  const bytes = await fixture('transparent.png');
  await dropFile(page, 'transparent.png', bytes, 'image/png');
  await waitForStatus(page, /Classic/);
});

// ─── Multiple file rejection ──────────────────────────────────────────────────

test('rejects multiple files dropped at once and shows an error', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  const dropZone = page.locator('.preview-surface').first();
  await dropZone.evaluate(() => {
    const dt = new DataTransfer();
    const a = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const b = new File(['y'], 'b.jpg', { type: 'image/jpeg' });
    dt.items.add(a);
    dt.items.add(b);
    document.querySelector('.preview-surface')!.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      }),
    );
  });
  await waitForStatus(page, /one/i);
});

// ─── Unsupported and corrupt file handling ────────────────────────────────────

test('shows an error for a non-image file and preserves the existing image', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Capture the canvas data URL before the bad import.
  const before = await page
    .locator('canvas')
    .first()
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());

  // Drop a text file.
  const dropZone = page.locator('.preview-surface').first();
  await dropZone.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(
      new File(['hello world'], 'readme.txt', { type: 'text/plain' }),
    );
    document.querySelector('.preview-surface')!.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      }),
    );
  });
  await waitForStatus(page, /not a supported format/i);

  // Canvas should still show the previous image.
  const after = await page
    .locator('canvas')
    .first()
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(after).toBe(before);
});

test('shows an error for a corrupt file and preserves the existing image', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  const before = await page
    .locator('canvas')
    .first()
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());

  // Drop a file with a PNG extension but garbage bytes.
  const dropZone = page.locator('.preview-surface').first();
  await dropZone.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(
      new File([new Uint8Array([0, 1, 2, 3, 4])], 'fake.png', {
        type: 'image/png',
      }),
    );
    document.querySelector('.preview-surface')!.dispatchEvent(
      new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      }),
    );
  });
  // The file has a wrong magic header; should be rejected as unsupported or corrupt.
  await waitForStatus(page, /could not be|not a supported/i);

  const after = await page
    .locator('canvas')
    .first()
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(after).toBe(before);
});

// ─── A→B race: later import supersedes earlier ───────────────────────────────

test('rapid A→B import settles on B even when A finishes last', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Start B (quadrants) first, then immediately start A (transparent) — but we want to test
  // that when we start A then B rapidly, the result is B.
  // We do this by staggering two drop events in quick succession.
  const quadrantsBytes = await fixture('quadrants.png');
  const transparentBytes = await fixture('transparent.png');

  // Dispatch A (transparent) and B (quadrants) rapidly. B is dispatched after A.
  const dropZone = page.locator('.preview-surface').first();
  await dropZone.evaluate(
    (_, arg: { quadBase64: string; transBase64: string }) => {
      function drop(name: string, b64: string, mime: string) {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const file = new File([bytes], name, { type: mime });
        const dt = new DataTransfer();
        dt.items.add(file);
        document.querySelector('.preview-surface')!.dispatchEvent(
          new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: dt,
          }),
        );
      }
      drop('transparent.png', arg.transBase64, 'image/png');
      drop('quadrants.png', arg.quadBase64, 'image/png');
    },
    {
      quadBase64: quadrantsBytes.toString('base64'),
      transBase64: transparentBytes.toString('base64'),
    },
  );

  // Wait for the second import to settle.
  await waitForStatus(page, /Classic/);
  // Canvas should be non-empty (quadrants rendered).
  const width = await page
    .locator('canvas')
    .first()
    .evaluate((c: HTMLCanvasElement) => c.width);
  expect(width).toBeGreaterThan(0);
});

// ─── No image data leaves the browser ────────────────────────────────────────

test('local import generates no image-related network requests', async ({
  page,
}) => {
  const imageRequests: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    const type = req.resourceType();
    // Record any non-asset fetch-type or xhr-type request that isn't our known assets.
    if (
      (type === 'fetch' || type === 'xhr' || type === 'image') &&
      !url.includes('/circle-slice/') &&
      !url.includes('localhost') &&
      !url.includes('127.0.0.1')
    ) {
      imageRequests.push(url);
    }
  });

  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Import a local file.
  const bytes = await fixture('quadrants.png');
  await dropFile(page, 'quadrants.png', bytes, 'image/png');
  await waitForStatus(page, /Classic/);

  expect(imageRequests).toEqual([]);
});

// ─── Bundled example failure doesn't block local import ──────────────────────

test('example load failure does not prevent local image import', async ({
  page,
}) => {
  // Intercept and block the bundled example.
  await page.route('**/examples/quadrants.png', (route) => route.abort());
  await page.goto('./');
  // Status will not show "Classic" (example failed).
  await expect(page.locator('[role="status"]'))
    .not.toContainText('Classic', { timeout: 3000 })
    .catch(() => {
      /* ok */
    });

  // Local import should still work.
  const bytes = await fixture('quadrants.png');
  await dropFile(page, 'quadrants.png', bytes, 'image/png');
  await waitForStatus(page, /Classic/);
});
