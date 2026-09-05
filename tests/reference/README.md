# M0 Classic visual references

These are test-only references from `5162ee4`, not application code. `legacy/main.js` and `legacy/fit.min.js` are frozen byte-for-byte originals. `legacy/index.html` replaces unused dat.GUI with a shim and disables animation scheduling before loading the original script. Each load/explicit `slice.init()` draws once. `render.js` extracts only the draw body, replaces `this.steps`/`this.rotate` with arguments, and uses the frozen fit helper. The original loop is never used as the test runner.

The runner compares the extracted harness with the frozen original and with the stored canvas-only PNGs. It covers the full Cartesian product of:

- Ocean, generated quadrants, transparent quadrants, and portrait source.
- Artwork 480 × 480, 640 × 360, and 360 × 640.
- 1, 10, and 50 slices.
- 0°, −35°, and +10° per slice.

That is 108 cases. Names encode every setting. PNGs come from the canvas backing pixels, preserving alpha and excluding controls, page background, scaling, and overlays. Contact sheets are only review aids; their labels/thumbnail scaling are not parity expectations. The three generated input PNGs are also checked.

## Reproduce

Serve the repository root in one terminal:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

M0 used Node 24.20.0, Playwright 1.62.1 and its Chromium 151.0.7922.34 (revision 1234), macOS 26.6.2 (25G83), arm64, DPR 1. This is an installed automation browser, not a claim about current stable Chrome or release support. For a standalone tool install without adding M1's app package manifest:

```sh
npm install --prefix /tmp/circle-slice-reference --no-audit --no-fund --save-exact playwright@1.62.1
/tmp/circle-slice-reference/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/circle-slice-reference/node_modules node tests/reference/capture.cjs
```

If Playwright is already installed, set `NODE_PATH` to its containing `node_modules`. `REFERENCE_URL` overrides the local server origin. From the repo root, verify without overwriting references:

```sh
node tests/reference/capture.cjs
```

Only after investigating a deliberate baseline change, regenerate:

```sh
node tests/reference/capture.cjs --update
```

Inspect affected full-resolution images and contact sheets, review the manifest changes, and record the reason in `docs/validation.md`. Never update solely to make a failed comparison pass. The current tolerance is **zero bytes** in the recorded environment. Other OS/browser rasterization or PNG encoding may differ; investigate decoded pixel differences before establishing any antialiasing tolerance in M2. Cross-engine tolerances and CI baselines have not been established by M0.

Open `http://127.0.0.1:4173/tests/reference/?source=portrait&width=360&height=640&steps=10&rotate=-35` for a single manually inspectable case. This harness intentionally does not implement production validation or import UX.

## Evidence and preservation

`manifest.json` records environment, source hashes, settings, and expected PNG hashes. The runner verifies those source hashes in normal verification mode. `legacy-inspection.json` and `legacy-app-*.png` describe the unchanged app inspected at 1280 × 800 and 360 × 640; they are UI evidence, not canvas baselines. The idle frame count is one observation, not a performance benchmark.

M2 should compare its renderer against these images at matching logical dimensions, keep the frozen oracle independent, and diagnose differences before adopting any new expectation. Neither the legacy scripts nor the reference images belong in `public/` or `dist/`. The legacy photo and its derived screenshots inherit unresolved provenance; do not use them as release/example/promotional assets. The fit helper's original Justin Windle notice is retained; the repository's overall license remains unresolved. See `docs/architecture.md` and `tests/fixtures/README.md`.
