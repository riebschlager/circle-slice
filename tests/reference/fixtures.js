// Original geometric test data, created for this repository; no external assets/fonts.
// Canvas-only integer geometry makes the source pixels deterministic.
export function makeFixture(transparent = false, portrait = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  const colors = ['#e34b42', '#e9b936', '#247ba0', '#243d34'];
  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect((i % 2) * 400, Math.floor(i / 2) * 300, 400, 300);
  });
  // Binary-style quadrant labels: 1, 2, 3, 4 white bars; no system font.
  for (let q = 0; q < 4; q++) {
    for (let n = 0; n <= q; n++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((q % 2) * 400 + 60 + n * 30, Math.floor(q / 2) * 300 + 60, 18, 60);
    }
  }
  ctx.fillStyle = '#101820';
  for (let x = 0; x < 800; x += 40) {
    ctx.fillRect(x, 0, 20, 20);
    ctx.fillRect(x, 580, 20, 20);
  }
  for (let y = 0; y < 600; y += 40) {
    ctx.fillRect(0, y, 20, 20);
    ctx.fillRect(780, y, 20, 20);
  }
  ctx.fillRect(495, 345, 85, 85); // Off-center marker exposes layer/angle order.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(510, 360, 55, 55);
  if (transparent) {
    ctx.clearRect(240, 120, 210, 300);
    ctx.clearRect(0, 460, 220, 140);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(280, 160, 90, 220);
  }
  if (portrait) {
    const turned = document.createElement('canvas');
    turned.width = 600;
    turned.height = 800;
    const rotated = turned.getContext('2d');
    rotated.translate(600, 0);
    rotated.rotate(Math.PI / 2);
    rotated.drawImage(canvas, 0, 0);
    return turned;
  }
  return canvas;
}
