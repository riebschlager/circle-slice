# Circle Slice

> Clip, rotate, repeat.

[**Try the live tool!**](https://riebschlager.github.io/circle-slice/)

Circle Slice is a small, client-side creative tool for exploring concentric circular slicing and rotation effects on images. Open an image from your device, tune the concentric layer count and per-slice rotation, pick custom or preset artwork dimensions, and download the high-resolution artwork directly from your browser.

![Circle Slice preview](public/social/og-image.png)

## Workflow and Features

- **Local Image Import**: Open images via the persistent file picker or by dragging and dropping onto the editor. Reset supports selecting the same file consecutively.
- **Classic Concentric Effect**:
  - **Slices**: Integer count from 1 to 50 concentric circles.
  - **Rotation per slice**: Continuous rotation from −50° to +50° with 0.1° precision.
  - **Reset effect**: Quickly restore the signature 10-slice / 10° defaults without altering imported images or chosen dimensions.
- **Flexible Artwork Dimensions**:
  - Presets: Source aspect ratio, 1:1 Square, 4:3 Landscape, 3:4 Portrait.
  - Custom: Explicit pixel width and height inputs with real-time limit messaging.
  - Dimensions are stable and independent of browser window resizing.
- **Original / Result Comparison**: Keyboard-accessible comparison toggle to view the original uncovered image alongside the effect.
- **Full-Resolution Export**:
  - Independent export canvas rendered at exact requested artwork dimensions from the full-resolution source (not an enlarged preview screenshot).
  - PNG export with transparency preservation or JPEG export with a white matte and selectable quality.
  - Automatic sanitized filenames with dimensions (`{name}-circle-slice-{W}x{H}.{ext}`).

## Privacy

**Your images stay on your device.**

- Processing happens entirely within your web browser using HTML5 Canvas 2D.
- No files, image data, or filenames are uploaded to any server or remote endpoint.
- No image bytes are saved to browser storage (`localStorage`, `IndexedDB`, or cookies).
- All application assets, fonts, and examples are self-contained and served locally.

## Supported Formats and Resource Limits

| Category          | Supported                      | Limits                                               |
| ----------------- | ------------------------------ | ---------------------------------------------------- |
| **Input formats** | JPEG, PNG, WebP                | Magic byte signature verification                    |
| **Input size**    | Up to 30 MiB                   | 40 million decoded pixels, 12,000 px on any axis     |
| **Export size**   | PNG or JPEG (quality 0.75–1.0) | Up to 16 million pixels, 8,192 px on any axis        |
| **Preview**       | Canvas 2D                      | Bounded at 2 million backing pixels, DPR capped at 2 |

## How the Effect Works

The **Classic** algorithm applies centered cover fitting of the full source image to the target artwork dimensions:

1. **Cover fit**: Scales the source image to cover the logical artwork canvas while preserving aspect ratio.
2. **Background wash**: A 25% transparent white wash composites over the full canvas.
3. **Concentric rings**: Circles are drawn from outermost (largest) to innermost (smallest):
   - Outer radius is set to $H / 2$, where $H$ is the artwork height.
   - For slice index $i \in [0, N-1]$, radius is $R \times (1 - i / N)$.
   - Each layer rotates around the center by $(i + 1) \times \text{rotation}$.
   - Layers overlap from outer to inner, revealing source pixels that rotate into view from outside the initial crop.

## Historical Processing Sketches

The repository includes historical Processing/Java sketches in [`p5/`](p5/):

- `CircleSlice.pde`: Early six-layer masked circle prototype with a square format and alternative rotation curve.
- `CircleSliceMix.pde` & `CircleSliceFullWidth.pde`: Two-image alternating sketch prototypes.

These sketches are historical reference prototypes written for the Java-based Processing environment, **not runnable browser p5.js dependencies**. The web application uses native HTML5 Canvas 2D without Processing dependencies.

## Development and Setup

Circle Slice requires Node 24 LTS and npm 11:

```sh
# Ensure compatible Node version
nvm install
nvm use

# Install dependencies from locked manifest
npm ci

# Start the local development server
npm run dev
```

### Scripts

| Script                 | Purpose                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`          | Start Vite local development server                                                |
| `npm run build`        | Run strict TypeScript typecheck and build production bundle to `dist/`             |
| `npm run preview`      | Serve production build locally                                                     |
| `npm run typecheck`    | Run strict TypeScript check (`tsc --noEmit`)                                       |
| `npm run lint`         | ESLint check for modern source, tests, and configuration                           |
| `npm run format:check` | Check code formatting with Prettier                                                |
| `npm run format`       | Automatically format code with Prettier                                            |
| `npm test`             | Run Vitest unit tests in non-watching CI mode                                      |
| `npm run test:e2e`     | Build and run Playwright browser tests against the production build                |
| `npm run check`        | Run all quality checks: formatting, lint, typecheck, unit tests, and browser tests |

### Browser Testing

Install Playwright Chromium before running end-to-end checks:

```sh
npx playwright install chromium
npm run test:e2e
```

## Deployment & CI/CD

Circle Slice is deployed to GitHub Pages at `https://riebschlager.github.io/circle-slice/` using GitHub Actions (`.github/workflows/deploy.yml`).

### CI/CD Workflow

- **Pull Requests:** Every pull request targeting `master` runs the `verify` job: locked install (`npm ci`), Prettier formatting check, ESLint, strict TypeScript checking, unit tests (Vitest), and end-to-end browser tests (Playwright Chromium against the production build). Pull requests are read-only and never deploy.
- **Production Deployment:** Pushes to `master` (and manual `workflow_dispatch`) run the `verify` suite first. Upon successful verification, the `verify` job uploads its tested `dist/` and the `deploy` job deploys it without rebuilding to GitHub Pages using the official `actions/deploy-pages` action under the `github-pages` environment with concurrency control.
- **Minimal Artifact:** Production builds are compiled with `base: '/circle-slice/'` into `dist/`. The deployed bundle contains only static application assets (`index.html`, bundled JavaScript and CSS, local examples, and social preview assets). Historical Processing sketches, test references/fixtures, and development configurations are strictly excluded from the site artifact.

Pages must use **Settings → Pages → Build and deployment → Source: GitHub Actions**. Deployments skip superseded commits, and a read-only post-deployment job verifies the public import/edit/download workflow. Manual dispatch must target `master` and deploys its current tip.

Run the public-site checks independently with:

```sh
PLAYWRIGHT_BASE_URL=https://riebschlager.github.io/circle-slice/ npx playwright test
```

### Rollback

- **Legacy 2018 site:** The pre-modernization commit is archived at `origin/gh-pages` (`5162ee4`). GitHub Pages can be restored to branch hosting via the GitHub API (`build_type: "legacy"` pointing to `gh-pages`).
- **Modern release rollback:** Revert the commit on `master` and push to trigger automated verification and redeployment.

See [MODERNIZATION_PLAN.md](MODERNIZATION_PLAN.md) and [docs/architecture.md](docs/architecture.md) for architectural records, validation benchmarks, and design decisions.
