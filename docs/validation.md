# Validation record

## M0 — Establish visual references and record decisions

Completed September 5, 2026. Application revision: `5162ee4`. Production HTML, JavaScript, CSS, and the ocean image remain unchanged. The pre-existing README edit and modernization plan were preserved.

**Change:** Added a test-only, one-shot legacy renderer, independent frozen-original oracle, 108 canvas-only reference PNGs, deterministic fixture generator and three input PNGs, source/settings/environment manifest, contact sheets, legacy UI evidence, and architecture/asset decisions.

**Environment:** macOS 26.6.2 build 25G83, arm64; Node 24.20.0; Playwright 1.62.1; headless Chromium 151.0.7922.34, revision 1234; device scale factor 1. This is a real browser canvas implementation. It is not a current-stable Chrome certification, physical mobile check, or Safari check.

**Unchanged app inspection:** Served at `http://127.0.0.1:4173/` using `python3 -m http.server 4173 --bind 127.0.0.1`. Opened the original entry point with its actual dat.GUI and scripts. At viewport 1280 × 800 the canvas was 1280 × 800, input 1920 × 1439, and defaults were 10 slices/10°. The GUI overlays the upper-right artwork and the fading drop instruction crosses the center. After changing the viewport to 360 × 640, the canvas became 360 × 640 and composition recropped; the large instruction and GUI consume much of the narrow view. Viewed both saved screenshots. An observational requestAnimationFrame wrapper counted 40 callbacks over a nominal 500 ms idle interval. This confirms ongoing rendering, not an FPS or latency benchmark. The app's loop was allowed to run only for this inspection; the context was closed afterward.

Evidence: [desktop screenshot](../tests/reference/legacy-app-1280x800.png), [narrow screenshot](../tests/reference/legacy-app-360x640.png), [measured values](../tests/reference/legacy-inspection.json).

**Commands/results:** With the installed Playwright `node_modules` on `NODE_PATH`, `node tests/reference/capture.cjs --update` generated 108 cases and reported exact PNG equality between the frozen original and extracted renderer with no page errors. A separate `node tests/reference/capture.cjs` verification reproduced all 108 stored PNGs and all three fixtures, also with no page errors. `cmp js/main.js tests/reference/legacy/main.js` and `cmp js/fit.min.js tests/reference/legacy/fit.min.js` passed. The normal capture command verifies source hashes against the manifest before comparing images. See the [reference guide](../tests/reference/README.md) for the isolated install and reproduction procedure.

**Visual review:** Viewed all four contact sheets (108 thumbnails), both original UI captures, and full-resolution portrait-gap and transparency cases. Square/landscape/portrait artwork crossed with 1/10/50 slices and 0/−35/+10° shows these intentional invariants:

- At zero rotation the opaque circle removes the wash from its interior while the outside stays lighter; additional opaque slices do not introduce a twist.
- One slice already rotates by the selected angle; positive and negative directions differ. Ten and fifty slices retain outer-to-inner overlap.
- Portrait artwork uses height/2 radius and clips at its side edges. It does not shrink the outer circle to the width.
- Edge ticks and off-center markers rotate into view from outside the initial centered crop. Keep the full fitted source available to every layer.
- With the portrait source in portrait artwork, rotated source edges and exposed earlier layers remain visible. These are not empty regions to fix with extra zoom.
- Transparent holes expose previous layers; partial white alpha accumulates through overlapping layers. Do not clear each circle or replace source-over composition.

Review sheets: [ocean](../tests/reference/sea-contact-sheet.png), [quadrants](../tests/reference/quadrants-contact-sheet.png), [transparency](../tests/reference/transparent-contact-sheet.png), [portrait source](../tests/reference/portrait-contact-sheet.png). Full-resolution spot checks: [portrait coverage](../tests/reference/baselines/portrait-360x640-n10-a-35.png), [transparency](../tests/reference/baselines/transparent-480x480-n10-a10.png).

**Intentional differences:** M0 introduces no application behavior changes. The reference runner disables scheduling and omits UI only. Future source-size composition, responsive controls, and independent export are deliberate changes described in [architecture](architecture.md); pixel parity always compares identical input/settings/artwork dimensions.

**Asset decision:** Ocean provenance and the overall project license remain unresolved after repository/history inspection. The generated quadrants fixture is selected for the modernized example; the existing ocean and its derived baselines remain legacy test evidence and must not be copied to release assets. The fit helper's copyright notice is preserved. Historical Processing/Java sketches are documented, including identical mixing sketches and missing inputs.

**Remaining:** M1 build foundation is next. No new production build exists yet; its exclusion of test/history files must be checked in M1/M7. M2 must compare its new renderer to these references. Cross-browser raster tolerances, EXIF/import/export workflows, accessibility, device performance, Safari/iOS, and deployment remain later milestones. No M0 evidence claims those checks passed.
