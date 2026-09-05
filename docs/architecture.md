# Architecture decisions

M0 recorded September 5, 2026 against `5162ee4`. These choices adopt the modernization plan's recommendations for implementation. M0 changes only references and documentation; the application still runs its original code.

## Stack and module boundaries

Use Vite, React, strict TypeScript, npm with a committed lockfile, native Canvas 2D, and plain CSS. React owns controls and editor status. A small rendering module accepts a decoded source, validated settings, explicit artwork dimensions, and a drawing context; it reads no DOM, window, files, or React state. Source ownership and asynchronous import/export lifetimes belong outside serializable settings.

Use Vitest for pure logic and Playwright for browser rendering/workflows. Add ESLint, formatting, and a separate TypeScript check in M1. M1 selected Node 24.20.0 LTS (`.nvmrc`), npm 11.19.0, React 19.2.8, Vite 8.2.2, TypeScript 6.0.3, Vitest 5.0.0, and Playwright 1.63.0. All direct packages and transitive resolutions are pinned in the manifest/lockfile. M7 CI should read `.nvmrc`. The installed M0 capture tools are evidence, not a decision about release versions.

The site remains a local-image, browser-only application at `/circle-slice/`. No server, remote-image import, storage of images, analytics, or optional creative features are introduced. Vite's production entry will import only application code; `tests/`, `docs/`, and `p5/` must remain outside `public/` and the deployment artifact. M1 builds only the React shell, CSS, and generated public example; inspection confirmed no reference/history files in `dist/`.

## Defaults and composition

Preserve Classic: centered cover fitting of the **whole source**, a white 25% background wash, overlapping circles drawn largest to smallest, radius based on artwork height/2, and angle `(i + 1) × rotation`. Keep the original source bounds after fitting; do not pre-crop before rotation. Portrait clipping, source pixels revealed from beyond the initial crop, transparent pixels compositing over earlier layers, and incomplete rotated rectangular coverage are intentional.

Use 10 slices and 10° per slice. Committed slice values are integers from 1–50; rotation ranges from −50° to 50° with 0.1° controls. Reset changes only effect settings. New imports retain effect settings and initialize artwork dimensions from the oriented source, proportionally reduced to export limits without upscaling. Resizing the window changes only preview resolution. Artwork dimensions are also export dimensions in the first release.

Support local JPEG, PNG, and WebP. PNG is the default export; JPEG uses quality 0.92 with white matte. Adopt the plan's provisional limits: input 30 MiB, 40 MP, 12,000 pixels/axis; output 16 MP, 8,192 pixels/axis; preview 2 MP and DPR capped at 2. These are application limits pending device measurements, not universal browser capabilities.

## Before and intended after

| Behavior       | Original app observed/read in M0                          | Planned release                                                                           |
| -------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Initial image  | `img/sea.jpg`, provenance unresolved                      | Locally bundled `sea.jpg` example, downscaled to 1600 × 1199; provenance still unresolved |
| Composition    | Canvas follows viewport; resizing changes crop and radius | Source-sized artwork, explicit size controls; stable across window changes                |
| Controls       | dat.GUI `steps`, `rotate`, `save` overlay                 | Labeled native controls, persistent Open image, Reset, Download                           |
| Rendering      | Self-scheduling loop; each load starts another chain      | Invalidate when dirty; at most one queued frame; no continuing idle frames                |
| Input          | Drop + FileReader; no picker or visible validation        | Shared picker/drop pipeline with validation, stale-result disposal, recoverable errors    |
| Export         | Current viewport, JPEG quality 1, timestamp filename      | Separate full-source render at explicit dimensions; PNG or JPEG                           |
| Classic pixels | Original draw order and geometry                          | Equivalent at identical source, artwork dimensions, and settings                          |

M1 provides a static example shell with no editor controls yet; [desktop](screenshots/m1-desktop.png) and [narrow](screenshots/m1-mobile.png) captures document this transitional state. [M0 validation](validation.md) and the [reference guide](../tests/reference/README.md) distinguish measured legacy evidence from future acceptance criteria.

## Assets and historical code

The ocean photo was added in commit `0ab5c5f8cd11cc3514ce7cd255f38c45c99c0171` on June 2, 2018 with message `add img folder`. The commit identifies who added the file, not its photographer, source URL, or redistribution terms. No project license or asset credit is present in the reviewed files/history. Its SHA-256 is recorded in the reference manifest. It served as the legacy comparison input through M0–M7, when the generated geometric fixture was used as the modernized example instead. On September 5, 2026 the user directed that the ocean photo become the bundled example. `public/examples/sea.jpg` is a downscaled re-encode (1600 × 1199, JPEG quality 82, 462 KB) of the 1920 × 1439 original, sized to stay under the 2 MP preview bound; it ships in `dist/`. `img/sea.jpg` is unchanged, so the reference manifest hash and legacy parity captures still resolve. Its provenance and the project license remain unresolved, so this is a deliberate decision to ship an asset without documented redistribution terms, not a resolution of the question. Derived reference captures still stay out of release assets. See [fixture provenance](../tests/fixtures/README.md). No project license or third-party credit has been invented.

`tests/reference/legacy/main.js` and `fit.min.js` are byte-for-byte copies from `5162ee4`. The fit helper retains `Copyright (C) 2014 Justin Windle, http://soulwire.co.uk`; that notice alone is not a newly established license grant. The extracted test renderer preserves its source attribution. Keep this historical material test-only and retain notices when removing production vendors later.

The `.pde` files under `p5/` are Processing/Java sketches, **not browser p5.js**. `CircleSlice` draws six square masked layers with a different rotation formula. `CircleSliceMix` and `CircleSliceFullWidth` are byte-identical alternating two-image sketches despite their names. Their input photos are absent; they are historical references, not release dependencies or the parity oracle.

## M2 rendering boundary

`src/state/settings.ts` owns effect defaults and committed-value normalization. Nonfinite values retain the last valid setting; finite values clamp and round to the control step. Numeric editing text remains future UI state. `src/render/sizing.ts` centralizes resource limits, source-sized artwork reduction, and uniform preview fitting after integer backing-size rounding.

`renderClassic` receives a borrowed source, its full decoded dimensions, artwork size, settings, and a context. It computes cover geometry once, resets drawing state, preserves the caller's context with balanced save/restore, and never schedules work. Supply a fresh/unclipped context; an inherited clip cannot be removed by resetting the transform. The same renderer can later draw a full-resolution export surface.

`createPreview` owns a ResizeObserver, a re-armed DPR media query, and at most one pending animation frame. Updates copy the latest settings/dimensions and borrow the latest source. Disposal disconnects both observers, cancels the frame, drops references, and releases the backing surface. The caller owns image disposal. `ExamplePreview` manages the bundled image and guards asynchronous completion across React StrictMode cleanup/remount. The 1600 × 1199 example is within preview limits; it was downscaled from the 1920 × 1439 original specifically to stay under the 2 MP bound, because unlike local imports the example's decoded source bitmap is not reduced after decoding. Arbitrary input decoding and bounded source caches remain M3. Canvas backing size is independent of artwork size and capped at 2 MP / DPR 2. Subpixel padding absorbs backing-size rounding with one uniform render transform.

## Deployment and delivery architecture

M7 uses `.github/workflows/deploy.yml`. The default branch was rechecked as `master` on September 5, 2026. Pages must use **Settings → Pages → Build and deployment → Source: GitHub Actions**. The audit found the live site serving unbuilt source HTML; the previous record claiming a verified cutover was incorrect. The user confirmed the Pages source change, and repaired run [33984076972](https://github.com/riebschlager/circle-slice/actions/runs/33984076972) subsequently passed verification, deployment, and live smoke checks. See [validation](validation.md#m7--configure-and-verify-github-pages-delivery) for evidence.

### Verification and artifact ownership

The read-only `verify` job runs locked install, formatting, lint, strict type checks, unit tests, and Chromium/Firefox/WebKit functional tests against the production build. Exact legacy parity and performance/DPR tests remain Chromium-specific. Only a successful push/manual run on `master` uploads that exact `dist/` with `actions/upload-pages-artifact@v3`. PRs run checks but cannot publish a Pages artifact or deploy.

The `deploy` job depends on verification and uses `actions/configure-pages@v5` and `actions/deploy-pages@v4`, without rebuilding. Only this job receives `pages: write` and `id-token: write`. The `github-pages` environment and `pages` concurrency group serialize rollouts without cancelling an in-flight deployment. Inside that lock, a read-only API check compares the run SHA with the current `master` SHA and skips superseded revisions. This prevents a slower old verification run from overwriting a newer deployment. A push arriving after the check can still cause a brief older rollout before its own verified deployment.

A separate read-only `smoke` job checks the returned public URL: direct load, refresh, assets, narrow layout, local file picker, effect controls, comparison, and PNG/JPEG downloads decoded at the displayed dimensions. Failed browser checks upload traces and screenshots. A smoke failure reports failure after deployment; it does not automatically roll back.

Checkout, Node setup, and diagnostic artifact actions use their documented v7 releases. Official guidance: [Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [deployment concurrency](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments), [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), and [upload-artifact](https://github.com/actions/upload-artifact).

### Rollback procedures

- **Modern release:** Revert the problematic source changes on `master`, retaining the repaired workflow and test harness, then push. The restored source is verified, deployed, and smoke-tested. Manual dispatch on `master` redeploys its current tip; it cannot deploy an arbitrary historical SHA or another branch. To restore older source, commit that restoration on `master` first.
- **Legacy site:** The remote `gh-pages` branch was rechecked at `5162ee42862b2c6b6238e3a20118ac6407c8b3f9`. Select “Deploy from a branch”, `gh-pages`, and `/ (root)` in Pages settings, save, and verify the resulting deployment. A branch can move; verify its SHA before using it for rollback. The earlier plan recorded this as the pre-cutover configuration, but its cutover claims were not reliable.

## Final audit: image ownership and export

The reducer is pure. An editor-owned resource set keeps decoded preview sources alive until the new preview input is committed, then closes replaced resources. Unmount invalidates import IDs, closes owned images, and cancels queued export work. Stale decodes are disposed by the import pipeline. The image-element fallback works even when `createImageBitmap` is absent, with a canvas fallback for preview downsampling. Both decoder paths are checked with an EXIF orientation fixture generated in the browser.

User files and the bundled example Blob are retained independently of their decoded previews. Large imports are downsampled to 2 MP without cropping source bounds; oriented source dimensions still determine geometry. Export acquires a separate full-resolution decode from the captured original bytes and releases it in `finally`. This permits subsequent imports and edits without invalidating the pending artwork. Downsampling does not remove initial full-decode peak memory.

JPEG applies a white background behind the completed Classic render using destination-over; applying it before rendering would be erased by Classic's clear. Encoding rejects null, empty, or wrong-MIME blobs and always releases the temporary canvas. The editor retains the latest successful download URL for a visible retry link, revoking it on replacement/unmount. The automatic download URL has a separate deferred cleanup.

Numeric Escape skips blur commit; Enter commits through blur once. Presets explicitly retain their selection and link dimensions, while Custom permits independent integer axes. Source restores the source ratio at the current long edge (capped at native source size). Validation errors persist until corrected. Preview layout is bounded by viewport height, including extreme portrait sizes.
