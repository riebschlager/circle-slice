# Generated image fixtures

Created September 5, 2026 for this repository with `tests/reference/fixtures.js` using only Canvas rectangles, fixed colors, and a quarter-turn transform. There are no downloaded assets, personal images, external fonts, or third-party source images. These newly created geometric assets can be used as the modernization's fixture/example without relying on the ocean photograph's unresolved provenance. This records their origin; it does not choose a license for the project.

- `quadrants.png`: 800 × 600 opaque red/yellow/blue/green quadrants. One through four white bars label the quadrants, black edge ticks expose pixels outside the initial crop, and an off-center square exposes angle/layer order. Selected as the permitted local example for M1.
- `transparent.png`: same geometry with clear regions and a 40% alpha white rectangle; exercises source-over composition and accumulation across overlapping layers.
- `portrait.png`: 600 × 800 quarter-turn of the opaque fixture; exercises the narrower source rectangle and rotated coverage gaps within height-based circles.

The capture runner regenerates and verifies their encoded pixels. SHA-256 hashes appear in `../reference/manifest.json`. PNG output is pinned to the recorded browser environment; source generation uses no randomness or font rendering.
