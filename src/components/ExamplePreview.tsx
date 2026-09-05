import { useEffect, useRef, useState } from 'react';
import { createPreview } from '../render/preview';
import { sourceArtworkSize } from '../render/sizing';
import { DEFAULT_SETTINGS } from '../state/settings';

export function ExamplePreview() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Loading example…');
  useEffect(() => {
    let active = true;
    const preview = createPreview(canvas.current!, container.current!);
    const image = new Image();
    image.src = `${import.meta.env.BASE_URL}examples/sea.jpg`;
    void image
      .decode()
      .then(() => {
        if (!active) return;
        const sourceSize = {
          width: image.naturalWidth,
          height: image.naturalHeight,
        };
        const artwork = sourceArtworkSize(sourceSize);
        container.current!.style.aspectRatio = `${artwork.width} / ${artwork.height}`;
        preview.update({
          source: image,
          sourceSize,
          artwork,
          settings: DEFAULT_SETTINGS,
        });
        setStatus(
          `Classic · 10 slices · 10° · ${artwork.width} × ${artwork.height}`,
        );
      })
      .catch(() => {
        if (active)
          setStatus('The example could not load. Please reload to try again.');
      });
    return () => {
      active = false;
      preview.dispose();
      image.removeAttribute('src');
    };
  }, []);
  return (
    <>
      <div ref={container} className="preview-surface">
        <canvas
          ref={canvas}
          role="img"
          aria-label="Ocean photograph with the Classic effect: 10 slices, 10 degrees per slice, 1600 by 1199 pixels"
        />
      </div>
      <figcaption>
        <span>01 / Bundled example</span>
        <span role="status">{status}</span>
      </figcaption>
    </>
  );
}
