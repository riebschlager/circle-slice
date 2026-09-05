import { expect, test } from '@playwright/test';

test('built shell and bundled example load directly and after refresh under the Pages path', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('./');
  for (const reload of [false, true]) {
    if (reload) await page.reload();
    await expect(page).toHaveTitle('Circle Slice');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Circle Slice.',
    );
    const example = page.getByRole('img', { name: /Circle Slice effect/ });
    await expect(example).toBeVisible();
    await expect(page.getByRole('status')).toContainText('800 × 600');
    expect(
      await example.evaluate((canvas: HTMLCanvasElement) => canvas.width),
    ).toBeGreaterThan(0);
  }
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  expect(errors).toEqual([]);
});
