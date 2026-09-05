# Circle Slice modernization plan

Status: M0–M3 complete (September 5, 2026); M4 is next. Reference capture, build validation, and decisions are recorded in `docs/validation.md` and `docs/architecture.md`. The Vite entry renders the bundled example with the Classic effect and supports local image import via file picker and drag and drop; production deployment remains M7.

Prepared: September 5, 2026. Repository reviewed at `5162ee4` (`change og image`).

## 1. Product intent and scope

Circle Slice is a small creative tool: open an image from your device, experiment with concentric circular layers and their rotation, then download the resulting artwork. The entire operation runs in the browser. GitHub Pages hosts the application at `https://riebschlager.github.io/circle-slice/`.

The modernization should make that workflow reliable, accessible, responsive, and easy to maintain while preserving the recognizable effect. A visitor should be able to make their first image without instructions beyond the interface itself.

This document is an executable work plan for coding agents. Sections 2–7 define the implementation contract; section 8 gives ordered tasks and acceptance criteria. Section 10 contains optional work, which is **not part of the initial release**. Stack choices and product defaults below are recommendations based on this review, not preferences already confirmed by the maintainer.

### Initial release

- Local JPEG, PNG, and WebP import through a file picker and drag and drop.
- An immediately usable bundled example, with a persistent “Open image” action.
- The existing concentric-circle effect, with reliable numeric controls and reset.
- Artwork dimensions independent of the browser window; source aspect ratio, square, landscape, portrait, and custom dimensions.
- Responsive preview, original/result comparison, and PNG/JPEG download at explicit pixel dimensions.
- Loading, validation, export, and recovery states; keyboard and touch operation.
- Repeatable build, meaningful tests, contributor documentation, and GitHub Pages deployment.

### Boundaries

No server, accounts, image uploads, analytics, external font service, remote image URL import, or image persistence in browser storage. No router is needed for this single-screen application. Do not introduce a full-stack framework, graphics engine, WebAssembly image codec, or service worker merely to modernize the dependency list. Optional creative features must not delay a usable core release.

## 2. Repository review

All 18 tracked project files were inventoried. Application source and Processing sketches were read; the bundled image was visually inspected. Vendored library code and generated variants were inspected, including module differences and source-map contents/structure. Generated bundles/maps are dependency artifacts, not additional application features. This is a source-based review; live-browser behavior, current Pages configuration, and performance measurements remain to be verified during implementation.

| Files                                                                                      | Current purpose                                                                                           | Planned treatment                                                                                                                            |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`                                                                               | Static entry point, three global scripts, full-window canvas, transient drop instruction, social metadata | Replace with Vite entry point and semantic application shell; retain useful metadata, correct Open Graph attributes, use local social assets |
| `js/main.js`                                                                               | Image loading, effect, dat.GUI setup, export, resize and drop handling in one file                        | Extract typed rendering, image lifecycle, state, and UI modules                                                                              |
| `css/main.css`                                                                             | Fading introduction overlay                                                                               | Replace with responsive application styles and persistent import guidance                                                                    |
| `css/reset.css`                                                                            | Broad element reset                                                                                       | Replace with a short modern baseline that preserves useful native control behavior                                                           |
| `js/fit.min.js`                                                                            | Generic rectangle/DOM fitting helper; app uses centered cover fitting                                     | Replace with a small pure rectangle-fit function                                                                                             |
| `js/canvas-to-image.min.js`                                                                | Canvas data URL → decoded bytes → Blob → legacy save fallbacks                                            | Replace with native Blob export and download handling                                                                                        |
| `js/gui/dat.gui.min.js`                                                                    | Loaded UI library, with injected styles                                                                   | Replace with labeled native controls composed in React                                                                                       |
| `js/gui/dat.gui.js`, `js/gui/dat.gui.module.js`                                            | Readable UMD and ES module versions; implementation matches apart from wrappers/exports                   | Remove after replacement and baseline verification                                                                                           |
| `js/gui/dat.gui.css`                                                                       | Standalone vendor styles; not linked by current HTML                                                      | Remove with dat.GUI                                                                                                                          |
| `js/gui/dat.gui.js.map`, `js/gui/dat.gui.module.js.map`                                    | Maps containing the same 22 upstream source entries                                                       | Remove with dat.GUI                                                                                                                          |
| `img/sea.jpg`                                                                              | Bundled ocean example, 1920 × 1439 JPEG                                                                   | Retain as a regression input; verify provenance before redistributing it in the new release, or substitute a documented permitted asset      |
| `p5/CircleSlice/CircleSlice.pde`                                                           | Processing/Java prototype: six shrinking masked circles, square output, different rotation formula        | Keep as historical reference; document that this is Processing, not browser p5.js                                                            |
| `p5/CircleSliceMix/CircleSliceMix.pde`, `p5/CircleSliceFullWidth/CircleSliceFullWidth.pde` | Alternating two-image prototype; files are byte-identical despite their names                             | Retain and document duplication; potential inspiration for later mixing mode                                                                 |
| `README.md`                                                                                | Demo link and five externally hosted example images                                                       | Add usage, development, architecture, deployment, limitations, and local examples                                                            |
| `.gitignore`                                                                               | macOS file plus two sketch paths                                                                          | Add build, dependency, test-output and correct nested Processing data/output exclusions                                                      |

There is no package manifest, lockfile, test suite, CI workflow, project license file, or project-specific agent instruction file in this checkout. Referenced Processing input images are absent. The sketches are historical references, not runnable release dependencies.

### Problems to address

1. **Render-loop accumulation.** Every image `load` invokes `slice.init`, which starts another self-scheduling `requestAnimationFrame` chain. No cancellation or single-loop guard exists. Replacing images repeatedly adds permanent work.
2. **Unnecessary idle rendering.** The static effect redraws continuously even when nothing changes.
3. **Viewport-dependent artwork.** Canvas dimensions track the window; resizing changes composition, crop, and saved resolution. There is no device-pixel-ratio handling for sharper previews.
4. **Fragile imports.** Files are read as base64 data URLs without type/size/decode validation or visible errors. Multiple dropped files race to replace the shared image. The fallback `dataTransfer.files` path is missing from import handling.
5. **Weak discoverability and accessibility.** The only image-import instruction fades away. There is no file picker for keyboard/mobile users. Vendor sliders and save actions use custom elements rather than accessible native range/button controls.
6. **Implicit parameter validation.** `steps` has no explicit integer step; the vendor slider can produce fractions. Renderer inputs are not independently validated.
7. **Limited export.** Save exports the current viewport as maximum-quality JPEG, using a synchronous data URL and extra copies; output size and filename are not user-controlled.
8. **Maintenance gaps.** Globals, inline event handlers, checked-in generated dependencies, absent build/test instructions, and external README/social imagery make maintenance less predictable.

Do not interpret existing artistic choices as defects: the background wash, height-based circle radius, and incomplete coverage from a rotated rectangular image all affect the current look.

## 3. Technical direction

| Area       | Recommendation                                                          | Reason                                                                                    |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Build      | Vite, npm, a committed lockfile                                         | Small static build and straightforward Pages support                                      |
| Language   | TypeScript with strict checking                                         | Explicit image ownership, valid settings, and asynchronous state transitions              |
| UI         | React with local state/reducer and small components                     | Practical composition of editor, import, history-ready settings, and export states        |
| Graphics   | Native Canvas 2D, isolated from React                                   | Existing effect fits this API; preserve a small, independently testable renderer          |
| Styling    | Plain CSS/CSS Modules, custom properties, Grid/Flexbox                  | Sufficient for one workspace without a CSS framework or component-library migration       |
| Validation | Small typed validation functions                                        | Few fields; runtime checks still apply to files, numbers, and any future imported recipes |
| Tests      | Vitest for pure logic; Playwright for real-browser canvas and workflows | Canvas behavior needs browser validation, not only mocked drawing calls                   |
| Quality    | ESLint, formatter, TypeScript check                                     | Consistent conventions and repeatable checks                                              |
| Deployment | GitHub Actions builds and publishes `dist/` to Pages                    | Deploy only tested static output                                                          |

React is a project tradeoff, not a prerequisite for modern code. Vite with vanilla TypeScript would also suit the current two-control demo; React is recommended for the richer editor states in this plan. Keep that choice at the UI boundary. React's documentation describes Vite as an option for a client-only application built from scratch; the routing/server-data concerns that motivate larger frameworks do not apply to this scope. [React guidance](https://react.dev/learn/build-a-react-app-from-scratch).

At implementation time, select compatible stable releases and a supported Node LTS satisfying their engine requirements. Record the Node version in the repository and CI; commit exact resolved dependencies through the lockfile. Do not hard-code version guesses from this document or use floating `latest` dependencies in CI.

Suggested structure (combine small modules when clearer; do not generate empty scaffolding):

```text
index.html
src/
  main.tsx
  App.tsx
  components/           # ImageInput, Preview, EffectControls, ExportControls, Status
  state/                # editor state, actions, validation, defaults
  render/               # geometry, circleSlice, preview scheduling
  images/               # decode, validation, source ownership
  export/               # export canvas, encoding, download
  styles/
public/
  examples/
  social/
tests/
  fixtures/
  unit/
  browser/
  reference/            # documented legacy render harness and approved baselines
docs/
  architecture.md
  validation.md
p5/                     # retained historical sketches
.github/workflows/
MODERNIZATION_PLAN.md
README.md
```

The renderer receives a decoded image, validated settings, logical artwork dimensions, and a drawing context. It must not read the window size, DOM controls, files, storage, or React state. React owns controls and status; decoded image resources live in a lifecycle owner/ref, not in serializable settings or undo snapshots.

## 4. Effect and composition contract

### Preserve the current algorithm as “Classic”

For artwork width `W`, height `H`, decoded image size `Iw × Ih`, integer slice count `N`, and per-slice rotation `a` in degrees:

```text
s  = max(W / Iw, H / Ih)
dw = Iw * s
dh = Ih * s
dx = (W - dw) / 2
dy = (H - dh) / 2
center = (W / 2, H / 2)
R = H / 2

clear the artwork
draw the source at (dx, dy, dw, dh)
draw white over the full artwork at alpha 0.25

for i = 0 through N - 1, in increasing order:
    radius = R * (1 - i / N)
    angle = (i + 1) * a * PI / 180
    save context
    clip a circle at center with radius
    translate to center; rotate by angle
    draw the original source at (dx - W/2, dy - H/2, dw, dh)
    restore context
```

These are overlapping filled circular layers, which produce visible rings as smaller layers cover larger ones. The outermost layer already rotates by `a`; it does not start at zero. Each layer draws from the original source, not from the previously rendered canvas. Do not rotate an already cropped artwork-size intermediate image: it discards source pixels that the existing algorithm can reveal after rotation.

In portrait artworks the Classic outer circle extends beyond the left/right artwork edges because its radius is `H/2`. A rotated source rectangle can leave portions of a clipped circle showing earlier layers/background. Preserve both behaviors in Classic. Do not silently add zoom-to-cover-rotation, clamp the radius to the short edge, use annular masks, or remove the wash. Transparent source pixels also composite over prior layers; clearing each ring would change that behavior.

Core defaults and validation:

| Setting            | Default                                                                  | Contract                                                                      |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Slice count        | 10                                                                       | Integer 1–50, explicit step 1; clamp/round finite committed values            |
| Rotation per slice | 10°                                                                      | −50° to 50°, UI step 0.1°; positive follows Canvas rotation direction         |
| Background wash    | 25%                                                                      | Fixed Classic value for the first release; adjustable version is optional     |
| Center and radius  | Artwork center, height/2                                                 | Fixed Classic geometry for the first release                                  |
| Artwork size       | Oriented source dimensions, proportionally reduced if over export limits | Chosen once on successful image import; never follows a later window resize   |
| Export             | PNG                                                                      | JPEG selectable, default quality 0.92, white matte for remaining transparency |

Allow incomplete numeric text while editing, without sending `NaN` to the renderer. On commit, normalize finite values and restore the last valid value with an inline message for invalid text. Apply the same validation to every state entry point. Reset restores effect defaults and leaves the image and artwork size in place.

### Separate three coordinate spaces

1. **Artwork:** stable logical `W × H`, selected by the user. This governs cover fitting, circle geometry, and aspect ratio.
2. **Preview:** a CSS box that fits the available workspace while preserving artwork aspect ratio. Its backing resolution accounts for device pixel ratio but is capped for performance. Apply a uniform artwork-to-preview transform before rendering; account for final integer backing-size rounding without visibly stretching circles.
3. **Export:** a separate canvas at the selected output pixel dimensions. Never enlarge a preview screenshot to export.

For the initial release, artwork width/height are also the export dimensions. Changing those fields changes composition intentionally and updates the preview. Changing window size, panel layout, or display density changes only preview resolution. Presets: source aspect ratio, 1:1, 4:3, 3:4, and custom. Aspect-ratio presets keep the current long-edge length; source sizing never silently upscales. Show exact dimensions and explain any reduction to fit limits.

The new source-size default intentionally differs from the legacy viewport-size default. Exact legacy comparisons use the same explicit `W × H`, input image, and parameters. This preserves the algorithm without carrying forward automatic recropping on browser resize.

## 5. Image lifecycle, rendering, and export

### Image input

- Use one import pipeline for file input and drop, including `dataTransfer.files` fallback. Reset the file input value so the same file can be selected again.
- Accept exactly one file per operation. Reject multiple-file selections/drops with “Choose one image at a time” rather than silently selecting a race winner. Reject folders and non-file drops.
- Support JPEG, PNG, and WebP. The `accept` attribute is a picker hint, not validation. Check type/signature as appropriate and require a successful decode; do not trust extensions alone. Give clear guidance for HEIC/HEIF, SVG, GIF, RAW, and corrupt files. Animated PNG/WebP, if decoded, produce one still frame; document that animation is not preserved.
- Prefer `createImageBitmap(file)` with orientation handling; use an image element with an object URL and asynchronous decode as a tested fallback. MDN documents metadata-based orientation and resize options; verify the actual primary and fallback paths with orientation fixtures. [Image decoding API](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap).
- Maintain a monotonically increasing import request ID. A later selection supersedes earlier work, including bundled-example loading. Discard and dispose stale results even when underlying decoding cannot be cancelled.
- Keep the last valid image visible while decoding a replacement. On failure preserve that image and its settings, report the error, and permit retry. On success preserve effect settings, reset artwork dimensions to the new source-size default, and release the replaced source after outstanding users finish.
- Retain the original File/Blob for export, plus a bounded preview image. Close replaced/stale `ImageBitmap`s, revoke owned object URLs, and clear temporary canvases/references. Avoid accumulating decoded full-resolution images.

### Resource policy

Start with these **application limits, to be validated on real devices**, not claims about universal browser limits: 30 MiB compressed input; 40 million decoded pixels; 12,000 pixels on either input axis; export at most 16 million pixels and 8,192 pixels per axis; preview at most 2 million backing pixels and device pixel ratio at most 2. Surface limits in actionable error text and keep them centralized.

Compressed file size does not predict decoded memory. A single 16-million-pixel RGBA surface costs roughly 64 MB before browser overhead, source copies, and encoding. Check dimensions as early as the chosen decoder permits; if checks occur after decode, document the remaining peak-memory exposure. Do not claim downsampling removes the initial decode cost. On allocation/decode/export failure, keep the editor usable and offer smaller dimensions; never silently save an incorrectly sized or blank file. Lower defaults if mobile evidence requires it.

### Rendering

- Replace the permanent loop with invalidation on image, settings, artwork dimensions, or preview size changes. Coalesce changes into at most one pending animation frame, draw the latest state once, and stop when clean.
- Use a container `ResizeObserver`; clean up observer, scheduled frame, and owned resources on disposal. React development remounts must not create duplicate listeners or jobs.
- Compute cover geometry once per render, keep save/restore balanced, reset context state explicitly, and retain the original full image bounds in any scaled source cache.
- Use bounded preview pixels during interaction and the original source for export. Start on the main thread and measure. MDN recommends avoiding unnecessary repeated canvas work and explains high-resolution display scaling. [Canvas optimization guidance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas).
- Add a Worker/OffscreenCanvas renderer only if measured interaction/export blocking requires it. Keep the same rendering contract and a main-thread fallback; test transferred image ownership and stale-result rejection. Worker-capable canvas rendering is available, but it is an enhancement rather than a required baseline. [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas).

### Export

- On Download, capture an immutable snapshot of the current source, settings, and dimensions. Keep that source alive until the operation completes. Subsequent edits/imports must not alter the in-flight result.
- Render a separate export canvas from the original source at requested dimensions. Announce “Preparing download”; disable duplicate export submissions. Yield so busy status can paint before expensive synchronous drawing. Do not show fabricated percentage progress.
- Encode through `toBlob()`, handling a null result, thrown exceptions, and the actual returned MIME type. PNG preserves resulting transparency; JPEG composites the completed artwork onto an explicit white matte before encoding. Offer quality only for JPEG. The API may fall back to PNG for unsupported encoders, so extension and content must agree. [Canvas Blob export](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob).
- Use a sanitized source basename plus `-circle-slice-WxH` and the correct extension; use a neutral example basename for the demo. Avoid inserting filenames as HTML.
- Download with an object URL and a real anchor. Retain a visible “Download again” link if the browser does not automatically start the download; verify on Safari/iOS. Revoke URLs only after they are no longer needed by download/retry UI, and release all temporary resources on success or failure.
- Original EXIF data is not deliberately copied into the result. Do not claim preservation of print DPI, HDR, wide-gamut color, or archival metadata. Document browser-dependent color/encoding differences.

### Privacy

Use interface copy such as “Your images stay on your device. Processing happens in this browser.” Explain in the README that loading the website still requests static assets from GitHub Pages. Do not send file data, filenames, or settings to any endpoint. Do not store image bytes in localStorage, IndexedDB, URL parameters, or logs. Source files are never overwritten. Serve example, UI, and social-preview assets locally.

## 6. UI and accessibility contract

The artwork is the visual focus. Use a restrained neutral workspace, a clear image boundary, readable controls, and one prominent Download action. Avoid placing controls over the image, where image colors can obscure them or make them look like part of the export.

- **Wide screens:** preview beside a compact settings panel; toolbar contains Open image, Reset effect, and Download.
- **Narrow screens:** preview above controls in normal document flow. Import and Download remain easy to reach; do not shrink the desktop panel or require a modal drawer just to adjust two sliders.
- **Controls:** “Slices” and “Rotation per slice,” each with a native range input and associated number input. Explain rotation briefly: “Each inner circle turns another X°.” Put artwork size and export options in clearly labeled groups.
- **Comparison:** a keyboard-operable original/result toggle, using the same crop and artwork dimensions. This is display-only; export always saves the effect, even while viewing Original.
- **Status:** distinguish example loading, image loading, ready, import error, exporting, and export error. Errors are inline, actionable, and do not disappear before they can be read. Missing example assets must not prevent local import.
- **Accessibility:** native buttons and form elements; visible associated labels; fieldsets/legends for related choices; visible focus; clear disabled states; polite live status for completed loads/exports and errors, without announcing every slider movement. Label the preview and provide text describing its current settings. All work must be possible without dragging.
- **Layout quality:** no horizontal scrolling at 320 CSS pixels; useful at 200% zoom and reflow at 400%; allow text scaling, wrapped filenames, portrait images, and small landscape screens. Aim for 44 CSS pixel primary touch targets and respect reduced motion.

Target WCAG 2.2 AA for the interface, including text/control contrast, keyboard operation, focus visibility, and error identification. Automated scans supplement manual keyboard and screen-reader checks. Native labeled controls reduce the custom accessibility work required. [WAI form guidance](https://www.w3.org/WAI/tutorials/forms/), [WCAG 2.2 reference](https://www.w3.org/WAI/WCAG22/quickref/).

## 7. Validation strategy

Test observable outcomes and the effect's visual invariants. Do not treat mocked `ctx.arc()` call counts as proof that the art is correct.

| Layer            | Required evidence                                                                                                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure logic       | Cover geometry for square/landscape/portrait inputs; ring radii and angle order; parameter normalization; dimensions/limits; safe filenames; state transitions and stale-import handling                                                                                    |
| Rendering        | Real-browser comparison against legacy captures at identical sizes/settings; 1/10/50 slices, zero/negative/positive rotation, portrait clipping, source corners revealed by rotation, transparent source                                                                    |
| Import           | File picker and drop, fallback file list, same-file retry, multiple-file rejection, corrupt/unsupported input, oversized inputs, EXIF orientation, failed replacement preserves current work, rapid A→B import where A finishes last                                        |
| Preview          | Resize and DPR changes preserve composition; no frames after settling; repeated imports/remounts do not increase scheduled work; Original comparison preserves effect settings                                                                                              |
| Export           | Decode the downloaded file and assert dimensions and MIME/extension; PNG and JPEG contain expected artwork; JPEG matte is correct; uses full source detail rather than preview; pending export stays consistent across later edits/imports; encoding failure is recoverable |
| Interface        | Keyboard-only import/edit/download, labels and focus, automated accessibility scan, touch layouts, text zoom, visible errors and busy states                                                                                                                                |
| Delivery/privacy | Production build loads under `/circle-slice/`; example and all assets resolve; reload works; local import/edit/export generates no image-related network traffic or storage writes                                                                                          |

Use small generated fixtures with labeled quadrants, off-center markers, transparency, and known orientation; include the ocean image for recognizable visual comparison if its use is permitted. Keep fixtures deterministic and free of personal images.

Playwright supports screenshot comparisons, but results vary with browser/platform. Pin the browser/CI environment for baseline comparison, use small documented antialiasing tolerances, and inspect diff images before changing expectations. Use broad cross-browser functional checks separately; do not demand byte-identical JPEGs or color pixels across engines. [Playwright visual testing](https://playwright.dev/docs/test-snapshots). Vitest covers the small pure TypeScript modules. [Vitest guide](https://vitest.dev/guide/).

Initial support target: current stable Chrome, Edge, Firefox, and Safari at release, plus iOS Safari and Android Chrome. Record exact tested versions and devices. Playwright WebKit is useful coverage but does not replace a real Safari/iOS import/download check.

Performance acceptance starts with **zero continuing app render frames at idle** and one queued preview frame at a time. For a 12 MP source, 50 slices, and the bounded preview, target p95 input-to-preview latency under 100 ms during a five-second slider sweep on documented desktop and midrange mobile reference devices. Record source size, preview pixels, DPR, browser, hardware, and export timings. Treat this as an engineering target to measure, not a pre-existing result. If missed, lower interactive preview resolution first; add worker complexity only with evidence. Repeated import/export cycles must not retain a growing list of source bitmaps, URLs, or pending jobs.

## 8. Ordered implementation tasks

Each task should be a focused, reviewable commit or PR. Finish dependencies before dependent work. Update the checkboxes and add validation evidence as tasks land. Do not implement section 10 by default.

### M0 — Establish visual references and record decisions

Dependencies: none.

- [x] Serve the unchanged app locally and inspect it in a real browser; record viewport, browser, and defaults.
- [x] Capture canvas-only baselines with the bundled image and generated fixtures at square, landscape, and portrait dimensions, including the settings in section 7.
- [x] Create a minimal test-only reference harness for the original algorithm; preserve needed attribution. Keep it out of the production build. Do not keep the original infinite loop as the test runner.
- [x] Record stack/default choices and a short before/after behavior table in `docs/architecture.md`.
- [x] Record example-image provenance and existing license uncertainty. If unresolved, use a newly created permitted fixture/example; do not invent a project license or asset credit.

Acceptance: references are reproducible and visually inspected; agents can distinguish intentional layout/default changes from effect regressions. Historical sketches are documented without implying they are browser code.

M0 evidence: 108 canvas-only cases reproduce the frozen original exactly in the recorded Chromium environment; all contact sheets and selected full-size cases were visually inspected. See [validation](docs/validation.md), [architecture decisions](docs/architecture.md), and [reproduction guide](tests/reference/README.md). Ocean provenance remains unresolved; the generated quadrants fixture is selected for the modernized example.

### M1 — Add the build foundation

Dependencies: M0.

- [x] Introduce Vite, React, strict TypeScript, npm lockfile, Node version file, ESLint, and formatter.
- [x] Define scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `format:check`, `test`, and `test:e2e`. Make `test` a non-watching CI run; ensure type checking is a separate required check because bundling alone is insufficient.
- [x] Add a minimal application shell and Vitest/Playwright configuration with one useful geometry test and production-path smoke test.
- [x] Move/refer to public example assets through base-aware URLs; configure Vite `base: '/circle-slice/'` for the current deployment.
- [x] Update ignore rules for `node_modules/`, `dist/`, coverage, browser-test artifacts, and nested Processing data/output directories.

Acceptance: clean checkout installs with `npm ci`; checks and build pass; production preview loads at `/circle-slice/`. The old implementation remains available in Git/reference fixtures until parity is verified. Preserve user changes when introducing tooling.

M1 evidence: locked npm install, formatting, lint, strict type checks, seven geometry cases, and a Chromium production-path smoke test pass. The shell and generated example load directly and after refresh at `/circle-slice/`, with no overflow at 320 CSS pixels. Desktop and narrow screenshots were visually inspected; `dist/` excludes legacy/test/history material. See [validation](docs/validation.md).

### M2 — Extract a deterministic rendering core

Dependencies: M1.

- [x] Implement typed settings, defaults, normalization, cover geometry, and the Classic renderer.
- [x] Implement stable artwork dimensions, a bounded preview surface, resize observation, and one-frame invalidation scheduling.
- [x] Compare real canvas output with M0 references; inspect portrait clipping, layer order, wash, transparency, and rotated-image coverage.
- [x] Verify cleanup under repeated mounts and image changes; assert no idle rendering.

Acceptance: equivalent input/settings/dimensions reproduce Classic within documented raster tolerances; viewport resize does not change artwork geometry. Renderer imports no UI modules and schedules no frames itself.

M2 evidence: all 108 M0 references match exactly in Chromium; bounded previews preserve artwork through resize/DPR changes, coalesce updates, remain idle when clean, and cancel work on disposal. See [validation](docs/validation.md).

### M3 — Implement reliable local-image handling

Dependencies: M2.

- [x] Implement the shared picker/drop pipeline, format and resource validation, decode fallback, orientation handling, and explicit errors.
- [x] Implement source ownership, bounded preview decode, request IDs, stale-result disposal, and successful replacement semantics.
- [x] Handle bundled-example failure and user selection superseding example loading.
- [x] Add import/lifecycle browser tests and inspect repeated replacement resource behavior.

Acceptance: supported local files load through both entry points; A→B races end on B; invalid replacement preserves existing work; same-file retry works; no image data leaves the browser.

### M4 — Build the responsive editor interface

Dependencies: M3.

- [x] Replace dat.GUI and transient intro with the section 6 interface.
- [x] Wire sliders and numeric fields through shared validation; add Reset effect and Original/Result comparison.
- [x] Add source/square/landscape/portrait/custom artwork dimensions, linked aspect handling, and visible pixel limits.
- [x] Implement status and error UI, labels, focus styling, touch sizing, reduced motion, and canvas description.
- [x] Inspect desktop and mobile layouts with real images; perform keyboard, zoom, and automated accessibility checks.

Acceptance: a first-time visitor can load and edit an image using mouse, keyboard, or touch; resizing and comparison leave export settings intact; no controls obscure artwork.

M4 evidence: dat.GUI replaced with `EffectControls` (paired range + number inputs, draft text while editing, commit/normalize on Enter/blur/Escape, inline validation messages) and `ArtworkControls` (source/1∶1/4∶3/3∶4/custom presets, W×H pixel inputs, live pixel count, limit messaging). `EditorState` extended with `viewMode` ('result'/'original'), `RESET_SETTINGS`, `SET_ARTWORK`, `SET_VIEW_MODE` actions. Original/Result comparison toggle above the figcaption; comparison draws uncovered source without the Classic effect. Toolbar with Open image, Reset effect, Download (placeholder) across the full grid width. `main.css` rewritten with CSS custom properties, named grid areas (masthead/toolbar/example/controls), `@media (max-width: 700px)` single-column stacking, `@media (max-width: 400px)` tighter padding, `@media (prefers-reduced-motion)`. All 31 browser tests pass (18 existing + 13 new M4-specific: controls, toolbar, comparison, artwork presets, keyboard reachability, 320 px overflow check). Format, lint, typecheck, and unit tests all pass.

### M5 — Deliver independent full-resolution export

Dependencies: M4.

- [x] Implement export snapshots, temporary full-source decode as needed, separate canvas rendering, PNG/JPEG options, and JPEG matte/quality.
- [x] Implement busy/error/retry states, safe filenames, correct MIME handling, URL lifecycle, and duplicate-submission protection.
- [x] Verify downloaded dimensions, visual content, full-source detail, comparison-mode behavior, and concurrent edit/import consistency.
- [ ] Test download flow on real Safari/iOS as well as automated desktop browsers; test failure recovery and constrained output sizes.

Acceptance: exports match the selected composition at stated pixel dimensions regardless of preview size; no blank or wrongly labeled file is reported as successful. Failure leaves the editor usable.

M5 evidence: `src/export/` module added with three units: `render.ts` (separate export canvas, Classic render at 1:1 scale, white JPEG matte, `toBlob` with null/exception handling), `filename.ts` (sanitized basename, `-circle-slice-WxH` suffix, correct extension), `download.ts` (object URL + anchor, deferred revoke). `EditorState` extended with `exportSettings` (format/quality) and `exportStatus` (`idle`/`exporting`/`error`). Download button in toolbar: snapshots source/settings/artwork at click time, guards duplicate submissions, yields one animation frame before rendering so busy state can paint, dispatches `EXPORT_SUCCESS`/`EXPORT_FAILURE`. `ExportControls` fieldset: PNG/JPEG radio buttons, JPEG quality slider with datalist snaps. Export status banner: "Preparing download…" during export, error message + Dismiss on failure. 9 new unit tests (filename sanitization, extension, null-file fallback, unsafe-char stripping, basename cap) and 13 new browser tests (disabled state, PNG/JPEG selection, quality slider visibility, download triggers, PNG dimensions verified against artwork status, JPEG extension, comparison-mode exports effect not source, duplicate-submission button state, forced-failure recovery + Dismiss, radio disabled state, filename encodes dimensions). All 44 browser tests and 40 unit tests pass. Real Safari/iOS download verification pending M6.

### M6 — Harden, document, and remove obsolete code

Dependencies: M5.

- [ ] Complete section 7 validation and record results, commands, browser/device versions, visual differences, and known limits in `docs/validation.md`.
- [ ] Measure interaction latency and resource cleanup; optimize only demonstrated bottlenecks.
- [ ] Remove production references to legacy globals, inline handlers, fit/export helpers, and every dat.GUI artifact, then remove those unused files. Preserve any attribution needed by retained reference material.
- [ ] Replace reset/styles and refresh metadata: use `property` for Open Graph, correct canonical/asset URLs, and a locally hosted social image. Do not change authorship without evidence.
- [ ] Rewrite README with use, privacy, supported formats/limits, setup, scripts, effect explanation, screenshot, historical sketch note, and deployment instructions. Keep the existing demo URL.

Acceptance: complete core workflow passes across the documented support matrix, production output contains only needed assets, and a new contributor can build/test without undocumented steps. No optional feature is required to pass this task.

### M7 — Configure and verify GitHub Pages delivery

Dependencies: M6. CI checks may be introduced earlier; production cutover follows core validation.

- [ ] Add PR CI running locked install, formatting check, lint, typecheck, unit tests, production build, and browser tests against the built app. Upload failure traces/diffs as artifacts.
- [ ] Inspect the repository's actual default branch and existing Pages source/settings. Configure Pages to use GitHub Actions when publishing the modernization; do not assume the current branch name or hosting mode.
- [ ] Add default-branch/manual deployment with successful verification as a dependency, the `github-pages` environment, and concurrency protection against obsolete deployments.
- [ ] Use the official configure/upload/deploy Pages actions with currently supported releases. Keep normal CI at read-only contents permissions; scope `pages: write` and `id-token: write` to deployment. PRs must not deploy.
- [ ] Publish `dist/` only. Keep historical sketches, test fixtures/harnesses, and development files out of the site artifact.
- [ ] Confirm the deployed `/circle-slice/` URL loads directly and on refresh; verify asset paths, local import, controls, and download on the real site.
- [ ] Document rollback: revert to a known-good source revision and redeploy through its working workflow; preserve the former Pages configuration details for rollback from the first cutover.

Vite requires the project subpath in `base` for this URL. GitHub documents the Pages artifact workflow and deployment permissions. Follow those guides at implementation time rather than copying stale action versions. [Vite Pages deployment](https://vite.dev/guide/static-deploy#github-pages), [GitHub custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Acceptance: only verified default-branch/manual builds publish; the public site performs the complete local-image workflow; setup and rollback are documented. If repository settings/permissions are unavailable, deliver the finished workflow and exact remaining setup step, and mark live deployment verification pending rather than claiming completion.

## 9. Agent handoff and completion rules

At the start of implementation, read this plan and applicable repository instructions, inspect the working tree, and select the earliest incomplete task whose dependencies are complete. Preserve unrelated changes. Re-check upstream dependency/API guidance where versions or compatibility matter.

For each completed task, record:

```text
Task: Mx — name
Change: observable behavior and relevant architecture
Validation: commands/results plus visual/manual evidence when applicable
Intentional differences: explanation and supporting screenshots, if any
Remaining: known limitations, unverified checks, and next task
```

Do not mark a task complete merely because code was written. Baseline updates require inspection; investigate differences instead of increasing tolerances to hide a changed algorithm. Do not claim mobile performance, real-device Safari behavior, or successful public deployment without checking them. If a proposed default must change based on evidence, update this document and the tests together.

Core release completion means M0–M7 acceptance criteria are met: Classic parity at equivalent dimensions, dependable local import, accessible responsive controls, stable composition, correct full-source export, no idle loop/resource accumulation, tested production build, and verified Pages delivery.

## 10. Optional feature backlog

These are ideas for subsequent releases, not prerequisites for modernization. Promote one to a separate task with explicit settings, lifecycle behavior, and acceptance criteria before implementing it.

| Priority | Idea                                         | Value and implementation considerations                                                                                                                                                                 |
| -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next     | Undo/redo for settings                       | Encourages experimentation; group a slider drag into one action, cap history, keep image bytes out of history, clear history on source replacement                                                      |
| Next     | Curated effect presets                       | Quick starting points such as gentle twist and dense spiral; store explicit validated settings, preserve source and artwork size, retain Classic                                                        |
| Next     | Adjustable wash, circle size, and center     | Extends the existing visual language; define normalized coordinates and radius basis, retain Classic defaults, provide numeric alternatives to dragging                                                 |
| Next     | Seeded random variations                     | One-click exploration with repeatable results; record the seed/algorithm version and make each action undoable                                                                                          |
| Later    | Two-image mixing                             | Directly inspired by the Processing sketches; alternate explicitly between independently cover-fitted sources, define layer/background ownership and unequal aspect ratios, budget both sources' memory |
| Later    | Export/import recipe JSON and share settings | Versioned, size-limited, validated parameters; never embed image bytes, filenames, or object URLs in a share link; recipient supplies their own image; URL fragment avoids Pages routing requirements   |
| Later    | Clipboard image paste                        | Convenient desktop input; use the normal paste event and existing import pipeline; preserve text-input paste and keep picker/drop as primary paths                                                      |
| Later    | WebP export / transparent circle-only art    | Feature-detect actual encoding; define transparency/background semantics explicitly instead of modifying Classic                                                                                        |
| Later    | Nonlinear ring spacing and rotation curves   | Broadens artistic range; retain a versioned linear Classic preset and add geometry/pixel tests                                                                                                          |
| Explore  | Batch processing                             | Apply one recipe to several files with a bounded sequential queue and progress/cancel; avoid decoding the entire batch at once                                                                          |
| Explore  | Animated rotation and video export           | Requires deliberate play/pause, timing, reduced-motion behavior, cancellation and browser codec work; static mode must remain idle                                                                      |
| Explore  | Installable/offline app                      | Useful only after the core is stable; define service-worker update behavior and caching scope without storing personal images                                                                           |

## 11. Remaining decisions

The application intent is sufficiently clear to implement the core plan without a discovery blocker. Defaults above resolve routine choices, but the maintainer may revise them before implementation:

- React versus the smaller vanilla-TypeScript alternative. Recommendation: React UI, independent Canvas renderer.
- Source-size composition versus preserving automatic viewport composition. Recommendation: source-size default, exact Classic comparisons at matching explicit dimensions.
- Supported image formats and device limits. Recommendation: JPEG/PNG/WebP first; tune limits from real-device evidence; defer HEIC decoding rather than adding a large codec dependency immediately.
- Which optional feature comes first. Recommendation: undo/redo, then curated presets, then adjustable geometry or two-image mixing.
- Project license and ocean/example-image provenance. Record the maintainer's actual choice or use a permitted replacement asset; do not infer copyright ownership or select a license on their behalf. Other implementation work can proceed independently.
