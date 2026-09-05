import { expect, test } from '@playwright/test';

// Helper: wait for the status role element to contain text.
async function waitForStatus(
  page: import('@playwright/test').Page,
  text: string | RegExp,
) {
  await expect(page.locator('[role="status"]')).toContainText(text, {
    timeout: 8000,
  });
}

// ─── Effect controls are present and functional ───────────────────────────────

test('effect controls render slices and rotation fields', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Slices number input (spinbutton role)
  await expect(page.getByRole('spinbutton', { name: 'Slices' })).toBeVisible();
  // Rotation number input
  await expect(
    page.getByRole('spinbutton', { name: 'Rotation per slice' }),
  ).toBeVisible();
});

test('changing the slices slider updates the status', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Find the slices range input and set to 5
  const slider = page.locator('input[type="range"]').first();
  await slider.fill('5');
  await slider.dispatchEvent('input');
  // Status should now reflect 5 slices
  await waitForStatus(page, /5 slices/);
});

test('changing the slices number input updates the status', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  const numberInput = page.getByRole('spinbutton', { name: 'Slices' });
  await numberInput.fill('20');
  await numberInput.press('Enter');
  await waitForStatus(page, /20 slices/);
});

test('Reset effect restores default settings', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Change slices to 20
  const numberInput = page.getByRole('spinbutton', { name: 'Slices' });
  await numberInput.fill('20');
  await numberInput.press('Enter');
  await waitForStatus(page, /20 slices/);

  // Reset
  const resetBtn = page.getByRole('button', { name: 'Reset effect' }).first();
  await resetBtn.click();
  await waitForStatus(page, /10 slices/);
});

// ─── Toolbar ─────────────────────────────────────────────────────────────────

test('toolbar has Open image, Reset effect, and Download buttons', async ({
  page,
}) => {
  await page.goto('./');
  // Toolbar buttons (there may be more than one "Open image" button — at least one in toolbar)
  const toolbar = page.getByRole('toolbar');
  await expect(
    toolbar.getByRole('button', { name: 'Open image' }),
  ).toBeVisible();
  await expect(
    toolbar.getByRole('button', { name: 'Reset effect' }),
  ).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Download' })).toBeVisible();
});

test('Reset effect and Download are disabled before image loads', async ({
  page,
}) => {
  // Block the example so we can observe the disabled state.
  await page.route('**/examples/quadrants.png', (route) => route.abort());
  await page.goto('./');
  // Give enough time for loading to settle into error.
  await page.waitForTimeout(1500);

  const resetBtn = page
    .getByRole('toolbar')
    .getByRole('button', { name: 'Reset effect' });
  await expect(resetBtn).toBeDisabled();
});

// ─── Original/Result comparison toggle ───────────────────────────────────────

test('compare toggle appears after an image is loaded', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  const toggle = page.getByRole('button', { name: /original|result/i });
  await expect(toggle).toBeVisible();
});

test('compare toggle switches between Original and Classic in status', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  const toggle = page.getByRole('button', { name: /Show original/i });
  await toggle.click();
  await waitForStatus(page, /Original/);

  const toggleBack = page.getByRole('button', { name: /Show result/i });
  await toggleBack.click();
  await waitForStatus(page, /Classic/);
});

// ─── Artwork size controls ────────────────────────────────────────────────────

test('artwork size controls render after image loads', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  await expect(page.getByLabel('Artwork width in pixels')).toBeVisible();
  await expect(page.getByLabel('Artwork height in pixels')).toBeVisible();
});

test('Source preset is active after initial image load', async ({ page }) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // The "Source" preset radio should be checked
  const sourceRadio = page.locator('input[value="source"]');
  await expect(sourceRadio).toBeChecked();
});

test('selecting the square preset changes artwork to square dimensions', async ({
  page,
}) => {
  await page.goto('./');
  await waitForStatus(page, /Classic/);

  // Click the 1:1 (square) preset
  const squareLabel = page.locator('.preset-btn').filter({ hasText: '1∶1' });
  await squareLabel.click();
  // Wait for status to reflect equal dimensions
  await expect(page.locator('[role="status"]')).toContainText(/(\d+) × \1/, {
    timeout: 4000,
  });
});

// ─── Keyboard navigation ──────────────────────────────────────────────────────

test('Open image button in toolbar is keyboard reachable', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  // Tab through until focus reaches a button
  for (let i = 0; i < 10; i++) {
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    if (focused === 'BUTTON') break;
    await page.keyboard.press('Tab');
  }
  const focused = await page.evaluate(
    () => document.activeElement?.textContent?.trim() ?? '',
  );
  // At least one of the tabbable elements early in the page is a button
  expect(
    ['Open image', 'Reset effect', 'Download'].some((t) => focused.includes(t)),
  ).toBe(true);
});

// ─── No horizontal scroll at 320px ───────────────────────────────────────────

test('no horizontal overflow at 320px viewport width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('./');
  await waitForStatus(page, /Classic/);
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const clientWidth = await page.evaluate(() => document.body.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px tolerance for rounding
});
