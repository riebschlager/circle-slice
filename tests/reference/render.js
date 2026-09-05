// Test-only extraction of js/main.js at 5162ee4 (Circle Slice repository).
// Only the draw body is retained; scheduling and UI are deliberately absent.
// Uses the frozen fit helper, retaining its Justin Windle copyright notice.
export function renderLegacy(canvas, img, steps, rotate) {
  const ctx = canvas.getContext('2d');
    let area = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    let rect = { x: 0, y: 0, width: img.width, height: img.height };
    let transform = fit(rect, area, { cover: true });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      img,
      transform.x,
      transform.y,
      transform.width,
      transform.height
    );
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let sizeStep = canvas.height / 2 / steps;
    for (let i = 0; i < steps; i++) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.height / 2 - i * sizeStep,
        0,
        Math.PI * 2,
        false
      );
      ctx.clip();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((i + 1) * rotate * Math.PI / 180);
      ctx.drawImage(
        img,
        -canvas.width / 2 + transform.x,
        -canvas.height / 2 + transform.y,
        transform.width,
        transform.height
      );
      ctx.restore();
    }
}
