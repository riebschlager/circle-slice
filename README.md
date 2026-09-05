# Circle Slice

[Modernization work plan](MODERNIZATION_PLAN.md)

## Development (M2)

The current Vite entry renders the bundled example with the Classic effect on a bounded, responsive canvas. Import, controls, and export arrive in M3–M5; this is not a production cutover. The original app remains in Git and the frozen test oracle is documented in [the reference guide](tests/reference/README.md).

Use Node 24.20.0 (`nvm install && nvm use` with nvm) and npm 11.19.0:

```sh
npm ci
npm run dev
```

Open the displayed URL at `/circle-slice/`. To test the production output:

```sh
npx playwright install chromium
npm run check
```

`check` requires formatting, lint, a separate strict type check, unit tests, a production build, and Chromium smoke, rendering parity, preview lifecycle, and resize/DPR tests. Browser installation is a one-time step per Playwright upgrade; Linux CI may need `npx playwright install --with-deps chromium`.

| Script                    | Purpose                                                                        |
| ------------------------- | ------------------------------------------------------------------------------ |
| `dev`                     | Vite development server                                                        |
| `build`                   | Required type check followed by production build in `dist/`                    |
| `preview`                 | Serve the existing production build                                            |
| `typecheck`               | Check application, tests, and TypeScript configuration files                   |
| `lint`                    | ESLint for modern source, tests, and configuration                             |
| `format:check` / `format` | Check / apply Prettier formatting                                              |
| `test`                    | Run Vitest once, without watch mode                                            |
| `test:e2e`                | Build, then run Playwright against a dedicated production preview on port 4273 |
| `check`                   | Run all required checks                                                        |

For manual preview, run `npm run build` then `npm run preview -- --host 127.0.0.1` and open `http://127.0.0.1:4173/circle-slice/`. Browser tests use a separate port, 4273, and deliberately refuse to reuse an unknown server. Deployment automation remains M7.

Only the generated quadrants example is copied into `public/examples/`; its source and provenance are in [tests/fixtures](tests/fixtures/README.md). Historical scripts, sketches, and frozen reference files are excluded from lint/format changes and the production build.

### [Try it out!](https://riebschlager.github.io/circle-slice/)

![](https://i.imgur.com/jTBJ1Gt.jpg)
![](https://i.imgur.com/Zs6av7W.jpg)
![](https://i.imgur.com/Xe6UjCo.jpg)
![](https://i.imgur.com/bnVFa2j.jpg)
![](https://i.imgur.com/2TfCkqs.jpg)
