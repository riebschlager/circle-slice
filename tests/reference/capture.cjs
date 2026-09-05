// Test-only runner. See README.md for an isolated, pinned Playwright install.
const { chromium } = require('playwright');
const { readFile, writeFile } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const path = require('node:path');
const os = require('node:os');
const base = process.env.REFERENCE_URL || 'http://127.0.0.1:4173';
const update = process.argv.includes('--update');
const root = path.resolve(__dirname, '../..');
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const png = url => Buffer.from(url.split(',')[1], 'base64');
const sizes = [[480, 480], [640, 360], [360, 640]];

(async () => {
  if (!update) {
    const manifest = JSON.parse(await readFile(path.join(__dirname, 'manifest.json'), 'utf8'));
    for (const [name, expected] of Object.entries(manifest.sources)) {
      if (hash(await readFile(path.join(root, name))) !== expected) throw new Error(`Reference source changed: ${name}`);
    }
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 960, height: 800 }, deviceScaleFactor: 1, colorScheme: 'light' });
    const errors = [];
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
    const reference = await context.newPage();
    const oracle = await context.newPage();
    await reference.goto(`${base}/tests/reference/`);
    await reference.evaluate(() => window.ready);
    await oracle.goto(`${base}/tests/reference/legacy/`);
    await oracle.waitForFunction(() => img.complete && img.naturalWidth > 0);
    const records = [];
    const sheets = [];
    for (const source of ['sea', 'quadrants', 'transparent', 'portrait']) {
      const tiles = [];
      for (const [width, height] of sizes) {
        for (const steps of [1, 10, 50]) {
          for (const rotate of [0, -35, 10]) {
            const settings = { source, width, height, steps, rotate };
            const id = `${source}-${width}x${height}-n${steps}-a${rotate}`;
            const result = await reference.evaluate(settings => window.renderCase(settings), settings);
            const sourceURL = source === 'sea' ? `${base}/img/sea.jpg` : await reference.evaluate(t => window.fixturePNG(t), source);
            const original = await oracle.evaluate(async ({ sourceURL, width, height, steps, rotate }) => {
              canvas.width = width;
              canvas.height = height;
              slice.steps = steps;
              slice.rotate = rotate;
              img.src = sourceURL;
              await img.decode();
              slice.init();
              return canvas.toDataURL('image/png');
            }, { ...settings, sourceURL });
            if (result !== original) throw new Error(`Extracted harness differs from frozen original: ${id}`);
            const bytes = png(original);
            const file = path.join(__dirname, 'baselines', `${id}.png`);
            if (update) await writeFile(file, bytes);
            else if (!(await readFile(file)).equals(bytes)) throw new Error(`Baseline differs: ${id}. Inspect the diff; do not automatically update.`);
            records.push({ id, ...settings, sha256: hash(bytes), oracleMatch: 'exact PNG bytes' });
            tiles.push({ id, url: original });
          }
        }
      }
      if (update) {
        const sheet = await reference.evaluate(async tiles => {
          const sheet = document.createElement('canvas');
          sheet.width = 900;
          sheet.height = 9 * 200;
          const ctx = sheet.getContext('2d');
          ctx.fillStyle = '#eee'; ctx.fillRect(0, 0, sheet.width, sheet.height);
          for (const [i, tile] of tiles.entries()) {
            const img = new Image(); img.src = tile.url; await img.decode();
            const x = (i % 3) * 300, y = Math.floor(i / 3) * 200;
            const scale = Math.min(280 / img.width, 168 / img.height);
            ctx.drawImage(img, x + (300 - img.width * scale) / 2, y, img.width * scale, img.height * scale);
            ctx.fillStyle = '#111'; ctx.font = '12px monospace';
            ctx.fillText(tile.id, x + 8, y + 188);
          }
          return sheet.toDataURL('image/png');
        }, tiles);
        await writeFile(path.join(__dirname, `${source}-contact-sheet.png`), png(sheet));
        sheets.push(`${source}-contact-sheet.png`);
      }
    }
    for (const source of ['quadrants', 'transparent', 'portrait']) {
      const bytes = png(await reference.evaluate(t => window.fixturePNG(t), source));
      const file = path.join(root, 'tests/fixtures', `${source}.png`);
      if (update) await writeFile(file, bytes);
      else if (!(await readFile(file)).equals(bytes)) throw new Error(`Fixture differs: ${file}`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
    if (update) {
      const sources = {};
      for (const name of ['tests/reference/legacy/main.js', 'tests/reference/legacy/fit.min.js', 'tests/reference/render.js', 'tests/reference/fixtures.js', 'img/sea.jpg', 'tests/fixtures/quadrants.png', 'tests/fixtures/transparent.png', 'tests/fixtures/portrait.png']) sources[name] = hash(await readFile(path.join(root, name)));
      await writeFile(path.join(__dirname, 'manifest.json'), JSON.stringify({
        capturedAt: new Date().toISOString(), legacyRevision: '5162ee4',
        environment: { playwright: require('playwright/package.json').version, browser: browser.version(), platform: os.platform(), arch: os.arch(), release: os.release(), deviceScaleFactor: 1 },
        tolerance: 'Zero: exact PNG bytes in the recorded environment. Cross-engine comparisons are not established by M0.',
        sources, sheets, cases: records,
      }, null, 2) + '\n');
    }
    console.log(`${records.length} cases: frozen original = extracted harness = ${update ? 'written baselines' : 'committed baselines'}; three generated fixtures verified; no page errors. Chromium ${browser.version()}.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
