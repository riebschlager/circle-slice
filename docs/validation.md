# Validation record

Current release status: see [Final source audit](#final-source-audit--september-5-2026). Earlier milestone entries are historical; their M3–M6 completion and coverage claims were found to be too broad. Real-device and manual accessibility acceptance remains open.

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

## M1 — Add the build foundation

Completed September 5, 2026.

**Change:** Added Vite/React, strict TypeScript, exact npm dependency versions and lockfile, `.nvmrc`, ESLint (including React Hooks rules), Prettier, Vitest, Playwright, and documented development/check commands. `build` requires type checking; `check` runs every required quality gate. Vitest runs only unit tests once; Playwright runs only browser tests against a fresh production build. Historical scripts and frozen references are excluded from lint/format mutation. Ignore rules cover build/dependency/test artifacts and nested Processing data/output directories.

**Environment:** macOS arm64; Node 24.20.0, npm 11.19.0; React 19.2.8, Vite 8.2.2, TypeScript 6.0.3, ESLint 10.10.0, Prettier 3.9.6, Vitest 5.0.0, Playwright 1.63.0; Chromium 153.0.8010.12 (revision 1243). Selected stable versions were checked against npm engine/peer metadata and the official [Vite requirements](https://vite.dev/guide/), [Vitest requirements](https://vitest.dev/guide/), and [Node release schedule](https://github.com/nodejs/Release). Browser server configuration follows [Playwright's web server guidance](https://playwright.dev/docs/test-webserver).

**Validation:** `npm ci` successfully rebuilt dependencies from the lockfile (zero audit vulnerabilities). Formatting, lint with zero warnings, strict `tsc --noEmit`, and seven geometry cases passed. `npm run test:e2e` built the app and passed the Chromium smoke test: direct `/circle-slice/` load, heading, decoded 800-pixel-wide example via the base-aware public URL, reload, no browser errors/failed asset requests, and no horizontal overflow at 320 CSS pixels. Initial browser startup found an existing server on 4173; the isolated test server now uses 4273 and never reuses an unknown server.

**Artifact/preservation checks:** `dist/` contains only `index.html`, one bundled JS file, one CSS file, and `examples/quadrants.png`. The public example is byte-identical to the M0 fixture. Original `js/main.js` and `js/fit.min.js` remain byte-identical to their frozen copies. No reference PNGs, ocean photo, legacy scripts, docs, or Processing files enter the build. `git diff --check` passed. M0 visual baselines were not regenerated; M2 must establish new-renderer parity.

**Visual review / intentional differences:** Inspected full-page captures at [1280 × 800 viewport](screenshots/m1-desktop.png) and [320 × 700 viewport](screenshots/m1-mobile.png). The new entry shows an original generated image in a minimal responsive React shell. Image proportions, heading, caption wrapping, and text layout are intact. This intentionally replaces the legacy editor entry during development; rendering, import, controls, and export are not implemented by M1. Public deployment has not changed. Useful legacy metadata remains in the entry pending M6's full metadata refresh.

**Remaining:** M2 deterministic rendering and parity checks are next. M3–M5 add local import, controls, and export. Full accessibility/reflow, cross-browser and real-device testing, performance, and Pages CI/deployment remain later milestone work; the M1 smoke test does not establish those guarantees.

## M2 — Extract a deterministic rendering core

Completed September 5, 2026. Environment matches M1: macOS arm64, Node 24.20.0, Playwright 1.63.0, Chromium 153.0.8010.12 (revision 1243).

**Change:** Added typed settings/defaults/normalization, centralized limits and artwork/preview sizing, the independent Classic Canvas renderer, and an invalidation-driven preview controller. The bundled example now displays the effect at stable 800 × 600 artwork dimensions. React development remounts invalidate stale example completions and dispose preview resources.

**Parity:** All 108 frozen M0 PNGs compare with zero differing decoded RGBA values in the current real Chromium canvas. This crosses ocean/quadrants/portrait/transparent sources, three artwork shapes, 1/10/50 slices, and 0/−35/+10° rotation. No reference files were regenerated and no tolerance was widened. The browser tests load source modules through test-only request interception; no test harness is included in production. Re-inspected the exact-matching portrait clipping/rotated coverage and transparent overlap reference images. Their edge ticks, exposed earlier layers, wash, and alpha overlap remain intact.

**Lifecycle and composition:** Six create/update/dispose cycles, each with a burst of 50 settings updates followed by a different source, observe at most one pending frame, the latest source in the rendered pixels, zero continuing callbacks during settled idle intervals, and no pending or executed work after disposal. The disposed backing canvas is released. Browser resize/DPR coverage compares preview pixels against independent renders at unchanged 800 × 600 artwork geometry, exercises DPR 1.25/2/3 and a 320-pixel viewport, and verifies exact restoration of the initial preview after returning to the original viewport/DPR. Chromium CDP density emulation requires a forced paint to dispatch media-query changes; the test explicitly supplies it. Pure tests cover caps and uniform scaling after integer rounding.

**Validation:** `npm run check` covers formatting, zero-warning lint, strict TypeScript, 11 unit cases, the production build, and seven Chromium browser tests (including the 108 parity comparisons). The initial sandbox prevented the localhost server from binding; browser checks run with the approved local-server permission. Desktop and narrow screenshots are generated in `test-results/`; reviewed copies are retained in `docs/screenshots/m2-*.png`. `dist/` still contains only the entry, application JS/CSS, and generated example. `git diff --check` passes.

**Scope/limits:** Pixel equality is measured in this Chromium/macOS environment, not promised across engines. The preview tests measure scheduling and cleanup, not mobile latency or heap usage. Local-file decoding, source ownership across asynchronous imports, numeric controls, export, broader accessibility, real-device testing, and deployment remain M3–M7. The current shell is still an intermediate development build.

## M3 — Implement reliable local-image handling

Completed September 5, 2026. Environment matches M2: macOS arm64, Node 24.20.0, Playwright 1.63.0, Chromium 153.0.8010.12 (revision 1243).

**Change:** Added `src/images/decode.ts` (magic-byte format detection, `createImageBitmap` primary decode with `HTMLImageElement` + object URL fallback, compressed/decoded/axis size checks, typed error kinds and actionable messages), `src/images/lifecycle.ts` (monotonically increasing request IDs, `importFile`/`importExample` with stale-result disposal, `ImageBitmap` ownership on success), `src/images/input.ts` (unified file picker and drag-and-drop extraction, multiple-file rejection, `resetFileInput` for same-file retry), and `src/state/editor.ts` (`EditorState`, typed `EditorAction`, `editorReducer` handling `IMPORT_START`/`IMPORT_SUCCESS`/`IMPORT_FAILURE`/`UPDATE_SETTINGS` with stale-dispatch guards and bitmap lifecycle). `App.tsx` now uses a single `Editor` component that loads the bundled example on mount, accepts local imports via picker and drop, and passes the decoded `ImageBitmap` to the existing preview controller. The intermediate development note was removed; the "Open image" button and drag-zone are the entry points.

**Import/lifecycle tests:** 10 new browser tests cover: bundled example loads on mount; PNG import via file picker; same-file retry via picker; PNG import via drag and drop; transparent PNG import; multiple-file drop rejection; non-image-file drop shows error and preserves the current image; corrupt-file drop shows error and preserves the current image; rapid A→B dispatch settles on the later result; local import generates no image-related network requests; example failure does not block local import. All 10 pass in Chromium.

**Stale-dispatch semantics:** `IMPORT_SUCCESS` arriving with a `requestId` below `latestRequestId` immediately closes the stale `ImageBitmap` and leaves state unchanged. `IMPORT_FAILURE` for a stale request is silently dropped. A failure for the current request leaves the existing `image` intact and shows an inline error. These behaviors are covered by unit tests.

**Resource cleanup:** Replaced `ImageBitmap` is closed in the reducer before the new reference is installed. Stale bitmaps returned from superseded `importFile`/`importExample` calls are closed before they reach the dispatch path. Object URLs created by the fallback decode path are revoked in a `finally` block.

**Validation:** `npm run check` covers formatting, zero-warning lint, strict TypeScript, 31 unit cases (20 new import/reducer tests), the production build, and 18 Chromium browser tests (11 pre-existing, 7 new import-lifecycle tests from `import.spec.ts` plus the smoke test update from `Geometric example` to `Circle Slice effect`). All pass. `dist/` still contains only the entry, application JS/CSS, and generated example.

**Intentional differences:** The canvas `aria-label` now reflects the actual effect parameters rather than a hardcoded "Geometric example" string; the smoke test was updated accordingly. The `ExamplePreview` component is superseded by `Editor`, which loads the same bundled example on mount. No M0 baselines were regenerated; M2 parity was not re-checked (the renderer is unchanged).

**Scope/limits:** Format detection relies on magic bytes for JPEG/PNG/WebP and falls back to `file.type` for ambiguous or missing signatures; actual decode validity is verified by `createImageBitmap`/`HTMLImageElement.decode`. EXIF orientation is handled by the `imageOrientation: 'from-image'` option where `createImageBitmap` supports it; the fallback path does not apply EXIF rotation correction explicitly (browser `decode()` may or may not apply it). Input limit checks occur after decode when dimensions are first known; peak memory during decode of an oversized file is not bounded before rejection. Real-device, Safari/iOS, HEIC, RAW, multi-device performance, and deployment checks remain M4–M7.

## M4 — Build the responsive editor interface

Completed September 5, 2026. Environment matches M3: macOS arm64, Node 24.20.0, Playwright 1.63.0, Chromium 153.0.8010.12 (revision 1243).

**Change:** Replaced dat.GUI and transient introductory overlay with the accessible, responsive React editor interface described in Section 6. Added:

- `src/components/EffectControls.tsx`: paired native range and number inputs for Slices (1–50) and Rotation per slice (−50° to 50° with 0.1° steps). Draft numeric text during typing; validation and normalization on Enter/blur/Escape; inline validation messages.
- `src/components/ArtworkControls.tsx`: preset selectors (Source, 1:1, 4:3, 3:4, Custom), custom W × H pixel inputs, live pixel count, and visible limit messaging (16 MP, 8,192 px/axis).
- `src/components/Toolbar.tsx`: persistent actions for "Open image", "Reset effect", and "Download".
- `src/components/CompareToggle.tsx`: Original/Result comparison toggle; draws uncovered source without effect while preserving settings and export readiness.
- `src/styles/main.css`: CSS custom properties, responsive CSS grid (`masthead`, `toolbar`, `example`, `controls`), `@media (max-width: 700px)` single-column stacking, `@media (max-width: 400px)` compact spacing, `@media (prefers-reduced-motion)` support, visible focus rings, and high contrast.

**Validation:** 13 new browser tests in `tests/browser/editor.spec.ts` covering: controls rendering, slider and number input synchronization, Reset effect restores defaults, toolbar buttons and states, comparison mode toggle and status text, artwork presets (source, square, etc.), keyboard reachability, and 0 horizontal overflow at 320 px viewport width. All 31 browser tests passed.

## M5 — Deliver independent full-resolution export

Completed September 5, 2026. Environment matches M4: macOS arm64, Node 24.20.0, Playwright 1.63.0, Chromium 153.0.8010.12 (revision 1243).

**Change:** Added independent full-resolution export pipeline:

- `src/export/render.ts`: separate export canvas rendered at requested artwork pixel dimensions directly from original source; explicit white matte for JPEG; `toBlob` handling with null/exception guards.
- `src/export/filename.ts`: sanitized basename, `-circle-slice-WxH` suffix, correct extension (`.png` or `.jpg`).
- `src/export/download.ts`: object URL trigger via hidden anchor, deferred URL revocation.
- `src/components/ExportControls.tsx`: PNG and JPEG radio controls; JPEG quality slider with datalist snap points (0.75, 0.85, 0.92, 1.0).
- `src/state/editor.ts`: export state management (`idle`, `exporting`, `error`), duplicate submission guards, yielding one animation frame so busy state can paint before synchronous rendering.

**Validation:** 9 unit tests in `tests/unit/export.test.ts` (filename sanitization, dimensions, extension agreement, unsafe char stripping, basename length cap). 13 new browser tests in `tests/browser/export.spec.ts` (button states, PNG/JPEG selection, quality slider visibility, download trigger, PNG header byte dimensions verification matching artwork dimensions, JPEG extension, comparison-mode exports effect, duplicate-submission lock, error dismissal). All 44 browser tests and 40 unit tests passed.

## M6 — Harden, document, and remove obsolete code

Completed September 5, 2026. Environment matches M5: macOS arm64, Node 24.20.0, Playwright 1.63.0, Chromium 153.0.8010.12 (revision 1243).

**Change:**

1. Hardened performance and resource lifecycle: added `tests/browser/perf.spec.ts` to validate the Section 7 acceptance criteria:
   - Evaluated 12 MP (4000 × 3000) interactive slider sweep over 50 consecutive steps.
   - Measured input-to-`requestAnimationFrame` completion latency:
     - Samples: 50
     - Minimum: 14.9 ms
     - Median (p50): 29.8 ms
     - p95: 53.0 ms (well below the 100 ms target budget)
     - p99: 58.9 ms
     - Maximum: 58.9 ms
   - Full 12 MP canvas export timings:
     - 12 MP Classic render (50 slices): 663.1 ms
     - PNG blob encoding: 34.4 ms (864 KB)
     - JPEG blob encoding: 38.2 ms (505 KB, quality 0.92)
   - Zero idle rendering: confirmed 0 continuing animation frames during settled idle periods.
   - Resource cleanup: 10 repeated full create/render/export/dispose lifecycles confirmed 0 leaked canvases, revoked object URLs, and zero lingering background jobs.
2. Removed legacy 2018 code:
   - Deleted root `js/` directory (`main.js`, `fit.min.js`, `canvas-to-image.min.js`, and `js/gui/` dat.GUI files).
   - Deleted root `css/` directory (`main.css`, `reset.css`).
   - Retained test-only frozen legacy copies in `tests/reference/legacy/` and `tests/reference/render.js` with the Justin Windle copyright notice preserved.
   - Updated `eslint.config.js` and `.prettierignore` to remove references to deleted paths.
3. Refreshed metadata and assets:
   - Generated local high-resolution Open Graph card `public/social/og-image.png` (1200 × 630 PNG) rendered via `renderClassic` from the permitted geometric fixture, removing external Imgur dependencies.
   - Updated `index.html`: Open Graph tags with `property="og:..."`, canonical link `https://riebschlager.github.io/circle-slice/`, `twitter:card` `summary_large_image`, local social image, and preserved authorship (`Chris Riebschlager` / `@riebschlager`).
   - Added modern baseline resets in `src/styles/main.css` for images, canvases, and form control font inheritance.
4. Rewrote `README.md` to provide comprehensive user and contributor documentation.

**Section 7 Validation Matrix Coverage:**

- Pure logic: Cover geometry for square/landscape/portrait inputs, ring radii and angle order, parameter normalization, dimensions/limits, safe filenames, state transitions, and stale-import handling (`tests/unit/geometry.test.ts`, `tests/unit/rendering.test.ts`, `tests/unit/import.test.ts`, `tests/unit/export.test.ts`).
- Rendering: 108 real-browser comparisons against legacy baselines across all sources (sea, quadrants, portrait, transparent), slice counts (1, 10, 50), and angles (0°, −35°, +10°); portrait clipping, rotated corners, transparent overlap all verified with 0 differing RGBA bytes (`tests/browser/rendering.spec.ts`).
- Import: File picker and drop, fallback file list, same-file retry, multiple-file rejection, corrupt/unsupported input, oversized inputs, EXIF orientation, failed replacement preserves current work, rapid A→B import (`tests/browser/import.spec.ts`).
- Preview: Resize and DPR changes preserve composition, no frames after settling, repeated imports/remounts do not increase scheduled work, Original comparison preserves effect settings (`tests/browser/rendering.spec.ts`, `tests/browser/editor.spec.ts`).
- Export: Downloaded PNG/JPEG decoding and header byte dimension verification, JPEG white matte, full source detail vs preview, pending export across edits/imports, error recovery (`tests/browser/export.spec.ts`).
- Interface: Keyboard-only import/edit/download, labels and focus, touch layouts, 0 horizontal overflow at 320 px, visible errors and busy states (`tests/browser/editor.spec.ts`, `tests/browser/smoke.spec.ts`).
- Delivery/privacy: Production build loads under `/circle-slice/`, all assets resolve locally, reload works, zero network traffic during import/edit/export (`tests/browser/smoke.spec.ts`, `tests/browser/import.spec.ts`).
- Performance: Zero continuing idle frames, bounded 2 MP preview backing canvas, p95 slider sweep latency 53.0 ms (< 100 ms target), resource cleanup verified across repeated cycles (`tests/browser/perf.spec.ts`).

**Scope/limits:**
Testing conducted on macOS arm64, Node 24.20.0, Chromium 153.0.8010.12. Physical mobile devices and real Safari/iOS remain to be tested on staging/production deployment in M7. Production bundle contains only modern assets.

## M7 — Configure and verify GitHub Pages delivery

Reopened and completed during the September 5, 2026 audit. The previous completion record was contradicted by live evidence; the repaired delivery is now verified.

**Findings:**

- [Run 33983535288](https://github.com/riebschlager/circle-slice/actions/runs/33983535288) at `9a92e7a` failed four parity groups on Ubuntu; 42 other browser tests passed and deployment was skipped. It compared Linux rasterization with macOS PNGs. For example, portrait `480x480-n1-a-35` differed in 8,365 RGBA bytes with maximum channel delta 16. M0 explicitly established no cross-platform pixel tolerance.
- The public HTML returned HTTP 200 but contained `/src/main.tsx`, which returned 404. Both live smoke tests failed: the app was blank. HTTP success for HTML alone did not establish a working deployment.
- Deployment rebuilt instead of publishing tested bytes; job concurrency alone allowed a slower old verification run to publish after a newer one.
- Manual rollback to an arbitrary prior commit was documented but unsupported by the default-branch gate.

**Changes:**

- All 108 cases now compare Classic against the independent, hash-checked frozen legacy render harness in the same browser, requiring zero differing RGBA bytes. macOS arm64 additionally compares the untouched frozen PNGs exactly. No renderer, reference image, source hash, or pixel tolerance was changed. The subsequent successful Linux run confirmed exact legacy parity in all 108 cases.
- The keyboard test waits for image loading to finish before tabbing, then asserts that Open image itself receives focus. It previously raced disabled toolbar buttons.
- Verification uploads the tested `dist/`; deployment consumes it without a second build. A check inside the deployment concurrency lock skips revisions no longer at the default-branch tip.
- Updated Node-based helper actions to documented v7 releases and added a read-only post-deployment smoke job with failure artifacts.
- Added a public-site smoke mode, restricted to tests that use the shipped interface and do not intercept source modules:

  ```sh
  PLAYWRIGHT_BASE_URL=https://riebschlager.github.io/circle-slice/ npx playwright test
  ```

**Local validation:** Node 24.20.0, Playwright 1.63.0, macOS arm64. Formatting, lint, typecheck, 40 unit tests, production build, and all 47 Chromium browser tests pass. This includes 108 exact same-browser legacy comparisons and 108 unchanged PNG comparisons. `dist/` contains only HTML, compiled JS/CSS, the example PNG, and social PNG.

**Intentional differences:** Delivery and validation changes only; application output is unchanged.

**Production validation:** Repair commit `01623db925edf12f1cef4eabb80240e9695e2c24` was pushed to `master`. The user confirmed changing Pages source to GitHub Actions. [Run 33984076972](https://github.com/riebschlager/circle-slice/actions/runs/33984076972) completed successfully: Linux verification (40 unit tests, 47 browser tests), deployment of the verified artifact, and both live smoke tests. These exercise direct load/refresh, local assets and social card, 320 px layout, picker import, slice edits, comparison, and downloaded PNG/JPEG decoding at the displayed dimensions. The public editor was additionally visually inspected in the Codex browser: artwork and controls rendered correctly. The formerly blank site now works.

**Remaining:** No M7 delivery tasks. Real Safari/iOS and physical mobile checks remain outstanding from M5/M6; Chromium does not substitute for them.

## Final source audit — September 5, 2026

**Findings and repairs:**

- JPEG's white matte was painted before Classic cleared the canvas, producing dark backgrounds for transparent inputs. The completed result is now flattened onto white. Encoder output is checked for nonempty content and the requested MIME, and the export canvas is released on all exit paths.
- Reducer-side bitmap disposal was impure and could invalidate a source still borrowed by preview/export. Disposal now belongs to the editor lifecycle, after preview replacement. Export captures original bytes and obtains its own full-resolution decode. Queued export work is canceled on unmount; pending decode results are disposed. The example Blob is retained, so exporting it does not refetch the example.
- Source previews were previously full-resolution despite the M3 checkbox. Imports now retain at most 2 MP of decoded preview pixels, with original source bounds preserved for geometry. The HTML image fallback now works without `createImageBitmap`, and a canvas fallback handles preview scaling.
- MIME hints previously permitted unsupported files to reach decoders. Accepted signatures now require JPEG, the full PNG signature, or RIFF plus WEBP. File type and extension cannot opt SVG/GIF into support.
- Escape previously committed edits through blur; Custom could not be selected; presets did not link axes; Source replaced the long edge with native size; fractional dimensions were truncated. These now follow the plan. Errors remain visible until corrected, and settings/dimensions are also validated at reducer entry points.
- The main picker was disabled during example loading, preventing a user from superseding a stalled example. It now remains available. A visible Download again link retains the latest successful file; URL replacement/unmount and temporary-anchor cleanup are explicit.
- Slider changes no longer trigger a polite live announcement on every step. Extremely tall artwork previews are bounded by viewport height, and dimension controls can wrap when text is enlarged.

**New evidence:** `tests/browser/audit.spec.ts` checks JPEG white pixels and PNG alpha, wrong-MIME/empty-blob failures and canvas cleanup, Escape cancellation and persistent validation, linked presets and Custom selection, decoding/export without `createImageBitmap`, picker supersession of a stalled example, bounded preview and one-pixel full-source detail, spoofed-format rejection, EXIF rotation through both decoder paths, byte-identical exports across a deliberately delayed decode and completed image replacement, deliberately out-of-order imports, retained bitmap counts across six actual editor replacements, supported WebP roundtrip where encoding exists, resource limits, extreme portrait sizing, and doubled text. The full-source detail check measures output pixels, not just file dimensions. Resource limit tests use stub decoded dimensions to avoid deliberately allocating oversized browser surfaces.

Automated axe-core WCAG A/AA scans run at desktop and 320 CSS pixels in Chromium, Firefox, and WebKit with zero violations. This supplements the keyboard assertions and does not establish screen-reader or full WCAG conformance. The macOS WebKit keyboard test uses Option-Tab, matching [Apple's documented navigation behavior](https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac); Linux uses Tab.

**Environment:** macOS arm64; Node 24.20.0; Playwright 1.63.0; Chromium 153.0.8010.12, Firefox 155.0, WebKit 26.6; axe-core Playwright integration 4.13.0. Chromium-specific parity/DPR/performance suites remain separate from cross-engine functional coverage. Frozen reference PNGs, hashes, and tolerances are unchanged.

**Final automated results:** `npm run check` passed formatting, ESLint, strict TypeScript, 42 unit tests, the production build, and 164 browser tests (60 Chromium, 52 Firefox, 52 WebKit). This includes all 108 exact same-browser Classic reference cases and unchanged macOS PNG comparisons. `npm install` reported zero audited dependency vulnerabilities. After the final announcement/duplicate-submission adjustments, formatting, lint, types, build, and all 12 affected browser workflow checks passed again. `git diff --check` passes. CI has been updated to install all three engines; its Linux run for this local revision remains pending publication.

**Visual review:** The 1280 × 800 desktop capture and 320 × 800 portrait capture were inspected. Artwork, toolbar, labels, fields, and export controls are legible and in normal document flow. Text at 200% reflows without horizontal overflow at 320 CSS pixels. This is viewport/text emulation, not a physical touch or browser zoom test.

**Corrections to earlier evidence:** The original export tests mostly checked filenames and PNG dimensions; they did not establish JPEG matte correctness, full-source detail, or consistency across replacement. The original A→B test dispatched two files without forcing completion order or asserting the winning filename. The earlier M6 import coverage list named EXIF/size/fallback cases without matching browser evidence. Those gaps are covered by the new regressions described above. The existing 12 MP benchmark measures the renderer over 50 samples; it does not establish a five-second physical mobile input-to-display benchmark or browser heap stability.

**Remaining release acceptance:**

- Real Safari/iOS picker/download/retry behavior, actual Android Chrome touch use, and physical midrange-device latency/constrained-memory exports.
- Manual screen-reader workflow, actual browser zoom at 200%/400%, and branded stable Chrome/Edge/Safari checks. Playwright's bundled engines do not substitute for those exact products/devices.
- Publish this audit revision and repeat CI/live workflow verification. The historical successful M7 deployment is unchanged; this turn has not pushed or deployed source.
- Project license and legacy ocean-image provenance remain unresolved; neither the legacy ocean nor its baselines is shipped in `dist/`. Optional features remain out of scope.
