import { renderClassic, type RenderInput } from './classic';
import { previewSurface } from './sizing';

/** Borrows the source until update/dispose; retains only the latest input. */
export function createPreview(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering is unavailable');
  let input: RenderInput | undefined;
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
      renderClassic(ctx, input, surface);
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
    update(next: RenderInput) {
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
