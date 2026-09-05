import { renderClassic, type RenderInput } from './classic';
import { coverRect } from './geometry';
import { previewSurface } from './sizing';

export interface PreviewInput extends RenderInput {
  /** When true, draw the source cover without the Classic effect (comparison mode). */
  originalOnly?: boolean;
}

/** Borrows the source until update/dispose; retains only the latest input. */
export function createPreview(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering is unavailable');
  let input: PreviewInput | undefined;
  let frame: number | undefined;
  let disposed = false;
  const invalidate = () => {
    if (disposed || frame !== undefined || !input) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      if (!input || disposed) return;
      const box = container.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return;
      const surface = previewSurface(
        input.artwork,
        box,
        window.devicePixelRatio,
      );
      if (canvas.width !== surface.width) canvas.width = surface.width;
      if (canvas.height !== surface.height) canvas.height = surface.height;
      if (input.originalOnly) {
        // Draw the source cover without the Classic effect.
        ctx.resetTransform();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.setTransform(
          surface.scale,
          0,
          0,
          surface.scale,
          surface.x,
          surface.y,
        );
        const rect = coverRect(input.sourceSize, input.artwork);
        ctx.drawImage(input.source, rect.x, rect.y, rect.width, rect.height);
      } else {
        renderClassic(ctx, input, surface);
      }
    });
  };
  const observer = new ResizeObserver(invalidate);
  observer.observe(container);
  let density = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  const densityChanged = () => {
    density.removeEventListener('change', densityChanged);
    density = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    density.addEventListener('change', densityChanged);
    invalidate();
  };
  density.addEventListener('change', densityChanged);
  return {
    update(next: PreviewInput) {
      if (disposed) return;
      input = {
        ...next,
        artwork: { ...next.artwork },
        sourceSize: { ...next.sourceSize },
        settings: { ...next.settings },
      };
      invalidate();
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      density.removeEventListener('change', densityChanged);
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
      input = undefined;
      canvas.width = canvas.height = 0;
    },
  };
}
