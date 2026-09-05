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
    await expect(page.getByRole('status')).toContainText('1600 × 1199');
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

test('local import, controls, comparison and decoded PNG/JPEG downloads work', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Classic');
  const social = await page.request.get('social/og-image.png');
  expect(social.ok()).toBe(true);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page
      .getByRole('button', { name: 'Open image', exact: true })
      .first()
      .click(),
  ]);
  await chooser.setFiles('tests/fixtures/portrait.png');
  await expect(page.locator('.fig-filename')).toHaveText('portrait.png');
  await page
    .getByRole('spinbutton', { name: 'Slices', exact: true })
    .fill('17');
  await page
    .getByRole('spinbutton', { name: 'Slices', exact: true })
    .press('Enter');
  await expect(page.getByRole('status')).toContainText('17 slices');
  await page
    .getByRole('button', { name: 'Show original', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Original');
  await page.getByRole('button', { name: 'Show result', exact: true }).click();
  for (const format of ['PNG', 'JPEG']) {
    await page.getByRole('radio', { name: format, exact: true }).check();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download', exact: true }).click(),
    ]);
    expect(await download.failure()).toBeNull();
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    const dimensions = await page.evaluate(
      async ({ base64, mime }) => {
        const image = new Image();
        image.src = `data:${mime};base64,${base64}`;
        await image.decode();
        return `${image.naturalWidth} × ${image.naturalHeight}`;
      },
      {
        base64: bytes.toString('base64'),
        mime: format === 'PNG' ? 'image/png' : 'image/jpeg',
      },
    );
    await expect(page.getByRole('status')).toContainText(dimensions);
    expect(download.suggestedFilename()).toMatch(
      format === 'PNG' ? /\.png$/ : /\.jpg$/,
    );
  }
});
