import { coverRect, type Size } from './geometry';
import { normalizeSettings, type EffectSettings } from '../state/settings';
import { assertArtworkSize } from './sizing';

export interface RenderInput {
  source: CanvasImageSource;
  sourceSize: Size;
  artwork: Size;
  settings: Readonly<EffectSettings>;
}

export function ringGeometry(height: number, slices: number, rotation: number) {
  const settings = normalizeSettings({ slices, rotation });
  return Array.from({ length: settings.slices }, (_, i) => ({
    radius: height / 2 - i * (height / 2 / settings.slices),
    angle: ((i + 1) * settings.rotation * Math.PI) / 180,
  }));
}

/** Caller owns a fresh/unclipped context. No DOM, scheduling, or source ownership. */
export function renderClassic(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  view = { scale: 1, x: 0, y: 0 },
) {
  assertArtworkSize(input.artwork);
  const rect = coverRect(input.sourceSize, input.artwork);
  const { width, height } = input.artwork;
  ctx.save();
  try {
    ctx.resetTransform();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    ctx.drawImage(input.source, rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, 0, width, height);
    for (const ring of ringGeometry(
      height,
      input.settings.slices,
      input.settings.rotation,
    )) {
      ctx.save();
      try {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, ring.radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(ring.angle);
        ctx.drawImage(
          input.source,
          rect.x - width / 2,
          rect.y - height / 2,
          rect.width,
          rect.height,
        );
      } finally {
        ctx.restore();
      }
    }
  } finally {
    ctx.restore();
  }
}
