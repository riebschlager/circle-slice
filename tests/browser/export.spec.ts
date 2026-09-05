import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Helper: wait for the status role element to contain text.
async function waitForStatus(page: Page, text: string | RegExp) {
  await expect(page.locator('[role="status"]').first()).toContainText(text, {
    timeout: 8000,
  });
}

// ─── Download button state ────────────────────────────────────────────────────

test('Download button is initially disabled while example loads', async ({
  page,
}) => {
  // Block the example so we can observe the disabled state.
  await page.route('**/examples/sea.jpg', (route) => route.abort());
  await page.goto('./');
  await page.waitForTimeout(800);

  const downloadBtn = page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Download' });
  await expect(downloadBtn).toBeDisabled();
});

test('Download button is enabled once an image is loaded', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  const downloadBtn = page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Download' });
  await expect(downloadBtn).toBeEnabled();
});

// ─── Export controls render ───────────────────────────────────────────────────

test('Export controls render PNG and JPEG radio buttons', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  await expect(page.getByRole('radio', { name: 'PNG' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'JPEG' })).toBeVisible();
});

test('PNG is selected by default', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  await expect(page.getByRole('radio', { name: 'PNG' })).toBeChecked();
});

test('selecting JPEG reveals the quality slider', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Quality slider should not be visible for PNG.
  await expect(page.locator('#export-quality')).not.toBeVisible();

  // Switch to JPEG.
  await page.getByRole('radio', { name: 'JPEG' }).click();

  // Quality slider should now appear.
  await expect(page.locator('#export-quality')).toBeVisible();
});

// ─── Download flow ────────────────────────────────────────────────────────────

test('clicking Download triggers a file download', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('toolbar').getByRole('button', { name: 'Download' }).click(),
  ]);

  expect(download).toBeTruthy();
  // Default PNG export
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  expect(download.suggestedFilename()).toContain('circle-slice');
});

test('downloaded PNG has correct dimensions matching the artwork', async ({
  page,
}, testInfo) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Read the artwork dimensions from the status bar.
  const statusText = await page
    .locator('[role="status"]')
    .first()
    .textContent();
  const dimensionMatch = /(\d+) × (\d+)/.exec(statusText ?? '');
  expect(dimensionMatch).not.toBeNull();
  const artworkW = parseInt(dimensionMatch![1]!, 10);
  const artworkH = parseInt(dimensionMatch![2]!, 10);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('toolbar').getByRole('button', { name: 'Download' }).click(),
  ]);

  // Read the downloaded PNG and check dimensions.
  const savePath = testInfo.outputPath('download.png');
  await download.saveAs(savePath);

  // Use Playwright's built-in image decoding to verify dimensions.
  // We do this by creating an image element in the page and loading the file.
  const pngBuffer = await readFile(savePath);
  // PNG header: bytes 16-19 = width, 20-23 = height (big-endian).
  const width = pngBuffer.readUInt32BE(16);
  const height = pngBuffer.readUInt32BE(20);
  expect(width).toBe(artworkW);
  expect(height).toBe(artworkH);

  // Cleanup.
  await import('node:fs/promises').then((fs) =>
    fs.unlink(savePath).catch(() => undefined),
  );
});

test('JPEG download has .jpg extension', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Switch to JPEG.
  await page.getByRole('radio', { name: 'JPEG' }).click();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('toolbar').getByRole('button', { name: 'Download' }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.jpg$/);
});

// ─── Comparison mode + export ─────────────────────────────────────────────────

test('Download while viewing Original still exports the effect (Classic result)', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Switch to Original view.
  await page.getByRole('button', { name: /Show original/i }).click();
  await waitForStatus(page, /Original/);

  // Download — should still produce the effect, not raw source.
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('toolbar').getByRole('button', { name: 'Download' }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.png$/);
  expect(download.suggestedFilename()).toContain('circle-slice');
});

// ─── Duplicate-submission protection ─────────────────────────────────────────

test('Download button blocks duplicate submissions while encoding is pending', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      Object.assign(window, {
        finishEncoding: () => {
          HTMLCanvasElement.prototype.toBlob = original;
          original.call(this, callback, type, quality);
        },
      });
    };
  });
  const downloads: string[] = [];
  page.on('download', (download) =>
    downloads.push(download.suggestedFilename()),
  );
  await page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Download' })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(
    page.getByRole('toolbar').getByRole('button', { name: 'Preparing…' }),
  ).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => 'finishEncoding' in window))
    .toBe(true);
  const downloaded = page.waitForEvent('download');
  await page.evaluate(() =>
    (window as unknown as { finishEncoding(): void }).finishEncoding(),
  );
  await downloaded;
  expect(downloads).toHaveLength(1);
});

// ─── Error recovery ───────────────────────────────────────────────────────────

test('failing export shows an error with a Dismiss button', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Sabotage toBlob to force an export failure.
  await page.evaluate(() => {
    const orig = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (
      callback: BlobCallback,
      ...args: [string?, number?]
    ) {
      // Only fail export canvases (large ones).
      if (this.width > 10) {
        callback(null);
      } else {
        orig.call(this, callback, ...args);
      }
    };
  });

  await page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Download' })
    .click();

  // Export failure message should appear.
  await expect(page.locator('.export-status--error')).toBeVisible({
    timeout: 5000,
  });

  // Dismiss should clear it.
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.locator('.export-status--error')).not.toBeVisible();

  // Download button should be re-enabled after dismissal.
  await expect(
    page.getByRole('toolbar').getByRole('button', { name: 'Download' }),
  ).toBeEnabled();
});

// ─── Export controls disabled state ──────────────────────────────────────────

test('Export format radio buttons are disabled when no image is loaded', async ({
  page,
}) => {
  // Block the example so no image loads.
  await page.route('**/examples/sea.jpg', (route) => route.abort());
  await page.goto('./');
  await page.waitForTimeout(1500);

  // The radio inputs inside the export fieldset should be disabled.
  await expect(page.getByRole('radio', { name: 'PNG' })).toBeDisabled();
  await expect(page.getByRole('radio', { name: 'JPEG' })).toBeDisabled();
});

// ─── Filename includes artwork dimensions ─────────────────────────────────────

test('filename encodes artwork dimensions', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  const statusText = await page
    .locator('[role="status"]')
    .first()
    .textContent();
  const dimensionMatch = /(\d+) × (\d+)/.exec(statusText ?? '');
  expect(dimensionMatch).not.toBeNull();
  const [, wStr, hStr] = dimensionMatch!;

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('toolbar').getByRole('button', { name: 'Download' }).click(),
  ]);

  expect(download.suggestedFilename()).toContain(`${wStr}x${hStr}`);
});
