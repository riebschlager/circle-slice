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

| Behavior       | Original app observed/read in M0                          | Planned release                                                                                    |
| -------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Initial image  | `img/sea.jpg`, provenance unresolved                      | Locally bundled generated `quadrants.png` fixture/example until a documented replacement is chosen |
| Composition    | Canvas follows viewport; resizing changes crop and radius | Source-sized artwork, explicit size controls; stable across window changes                         |
| Controls       | dat.GUI `steps`, `rotate`, `save` overlay                 | Labeled native controls, persistent Open image, Reset, Download                                    |
| Rendering      | Self-scheduling loop; each load starts another chain      | Invalidate when dirty; at most one queued frame; no continuing idle frames                         |
| Input          | Drop + FileReader; no picker or visible validation        | Shared picker/drop pipeline with validation, stale-result disposal, recoverable errors             |
| Export         | Current viewport, JPEG quality 1, timestamp filename      | Separate full-source render at explicit dimensions; PNG or JPEG                                    |
| Classic pixels | Original draw order and geometry                          | Equivalent at identical source, artwork dimensions, and settings                                   |

M1 provides a static example shell with no editor controls yet; [desktop](screenshots/m1-desktop.png) and [narrow](screenshots/m1-mobile.png) captures document this transitional state. [M0 validation](validation.md) and the [reference guide](../tests/reference/README.md) distinguish measured legacy evidence from future acceptance criteria.

## Assets and historical code

The ocean photo was added in commit `0ab5c5f8cd11cc3514ce7cd255f38c45c99c0171` on June 2, 2018 with message `add img folder`. The commit identifies who added the file, not its photographer, source URL, or redistribution terms. No project license or asset credit is present in the reviewed files/history. Its SHA-256 is recorded in the reference manifest. Keep it only as the existing legacy comparison input for now; do not copy it or its derived reference captures into the new release assets. Use the newly created geometric fixture as the initial modernized example. See [fixture provenance](../tests/fixtures/README.md). No project license or third-party credit has been invented.

`tests/reference/legacy/main.js` and `fit.min.js` are byte-for-byte copies from `5162ee4`. The fit helper retains `Copyright (C) 2014 Justin Windle, http://soulwire.co.uk`; that notice alone is not a newly established license grant. The extracted test renderer preserves its source attribution. Keep this historical material test-only and retain notices when removing production vendors later.

The `.pde` files under `p5/` are Processing/Java sketches, **not browser p5.js**. `CircleSlice` draws six square masked layers with a different rotation formula. `CircleSliceMix` and `CircleSliceFullWidth` are byte-identical alternating two-image sketches despite their names. Their input photos are absent; they are historical references, not release dependencies or the parity oracle.

## M2 rendering boundary

`src/state/settings.ts` owns effect defaults and committed-value normalization. Nonfinite values retain the last valid setting; finite values clamp and round to the control step. Numeric editing text remains future UI state. `src/render/sizing.ts` centralizes resource limits, source-sized artwork reduction, and uniform preview fitting after integer backing-size rounding.

`renderClassic` receives a borrowed source, its full decoded dimensions, artwork size, settings, and a context. It computes cover geometry once, resets drawing state, preserves the caller's context with balanced save/restore, and never schedules work. Supply a fresh/unclipped context; an inherited clip cannot be removed by resetting the transform. The same renderer can later draw a full-resolution export surface.

`createPreview` owns a ResizeObserver, a re-armed DPR media query, and at most one pending animation frame. Updates copy the latest settings/dimensions and borrow the latest source. Disposal disconnects both observers, cancels the frame, drops references, and releases the backing surface. The caller owns image disposal. `ExamplePreview` manages the bundled image and guards asynchronous completion across React StrictMode cleanup/remount. The 800 × 600 example is already within preview limits; arbitrary input decoding and bounded source caches remain M3. Canvas backing size is independent of artwork size and capped at 2 MP / DPR 2. Subpixel padding absorbs backing-size rounding with one uniform render transform.
