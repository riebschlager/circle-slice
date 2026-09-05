import { useCallback, useEffect, useRef, useState } from 'react';
import type { Size } from '../render/geometry';
import { assertArtworkSize, LIMITS } from '../render/sizing';

type Preset = 'source' | 'square' | 'landscape' | 'portrait' | 'custom';

interface Props {
  artwork: Size;
  sourceSize: Size;
  disabled?: boolean;
  onChange: (artwork: Size) => void;
}

function clampArtwork(w: number, h: number): Size {
  const scale = Math.min(
    1,
    LIMITS.artworkAxis / Math.max(w, h),
    Math.sqrt(LIMITS.artworkPixels / (w * h)),
  );
  return {
    width: Math.max(1, Math.floor(w * scale)),
    height: Math.max(1, Math.floor(h * scale)),
  };
}

function detectPreset(artwork: Size, sourceSize: Size): Preset {
  const sw = sourceSize.width;
  const sh = sourceSize.height;
  // Check source first (exact match after clamping).
  const sourceArtwork = clampArtwork(sw, sh);
  if (
    artwork.width === sourceArtwork.width &&
    artwork.height === sourceArtwork.height
  ) {
    return 'source';
  }
  if (artwork.width === artwork.height) return 'square';
  // Check landscape 4:3
  if (artwork.width > artwork.height) {
    if (Math.abs(artwork.width / artwork.height - 4 / 3) < 0.01)
      return 'landscape';
  } else {
    // 3:4 portrait
    if (Math.abs(artwork.height / artwork.width - 4 / 3) < 0.01)
      return 'portrait';
  }
  return 'custom';
}

function presetSize(
  preset: Preset,
  sourceSize: Size,
  currentArtwork: Size,
): Size {
  const sw = sourceSize.width;
  const sh = sourceSize.height;
  switch (preset) {
    case 'source': {
      const longEdge = Math.min(
        Math.max(currentArtwork.width, currentArtwork.height),
        Math.max(sw, sh),
      );
      const scale = longEdge / Math.max(sw, sh);
      return clampArtwork(Math.round(sw * scale), Math.round(sh * scale));
    }
    case 'square': {
      const side = Math.max(currentArtwork.width, currentArtwork.height);
      return clampArtwork(side, side);
    }
    case 'landscape': {
      const longEdge = Math.max(currentArtwork.width, currentArtwork.height);
      return clampArtwork(longEdge, Math.round((longEdge * 3) / 4));
    }
    case 'portrait': {
      const longEdge = Math.max(currentArtwork.width, currentArtwork.height);
      return clampArtwork(Math.round((longEdge * 3) / 4), longEdge);
    }
    case 'custom':
      return currentArtwork;
  }
}

function isOverLimit(w: number, h: number): boolean {
  return (
    !Number.isFinite(w) ||
    !Number.isFinite(h) ||
    w <= 0 ||
    h <= 0 ||
    w > LIMITS.artworkAxis ||
    h > LIMITS.artworkAxis ||
    w * h > LIMITS.artworkPixels
  );
}

export function ArtworkControls({
  artwork,
  sourceSize,
  disabled,
  onChange,
}: Props) {
  const [wText, setWText] = useState(artwork.width.toString());
  const [hText, setHText] = useState(artwork.height.toString());
  const [invalid, setInvalid] = useState(false);
  const skipBlur = useRef(false);
  const [currentPreset, setCurrentPreset] = useState<Preset>(() =>
    detectPreset(artwork, sourceSize),
  );
  const previousSource = useRef(sourceSize);
  useEffect(() => {
    if (previousSource.current !== sourceSize) {
      previousSource.current = sourceSize;
      setCurrentPreset(detectPreset(artwork, sourceSize));
    }
  }, [sourceSize, artwork]);

  // Sync text fields when artwork changes externally.
  const prevArtwork = useRef(artwork);
  useEffect(() => {
    if (prevArtwork.current !== artwork) {
      prevArtwork.current = artwork;
      setWText(artwork.width.toString());
      setHText(artwork.height.toString());
      setInvalid(false);
    }
  }, [artwork]);

  const commitCustom = useCallback(
    (rawW: string, rawH: string, axis: 'width' | 'height') => {
      let w = rawW.trim() ? Number(rawW) : NaN;
      let h = rawH.trim() ? Number(rawH) : NaN;
      const ratio =
        currentPreset === 'source'
          ? sourceSize.width / sourceSize.height
          : currentPreset === 'square'
            ? 1
            : currentPreset === 'landscape'
              ? 4 / 3
              : 3 / 4;
      if (currentPreset !== 'custom') {
        if (axis === 'width') h = Math.max(1, Math.round(w / ratio));
        else w = Math.max(1, Math.round(h * ratio));
      }
      if (!Number.isInteger(w) || !Number.isInteger(h) || isOverLimit(w, h)) {
        setInvalid(true);
        setWText(artwork.width.toString());
        setHText(artwork.height.toString());
        return;
      }
      setInvalid(false);
      try {
        assertArtworkSize({ width: w, height: h });
      } catch {
        setInvalid(true);
        setWText(artwork.width.toString());
        setHText(artwork.height.toString());
        return;
      }
      onChange({ width: w, height: h });
    },
    [artwork, onChange, currentPreset, sourceSize],
  );

  const handlePresetChange = useCallback(
    (preset: Preset) => {
      setCurrentPreset(preset);
      if (preset === 'custom') return; // user must type their own values
      const next = presetSize(preset, sourceSize, artwork);
      onChange(next);
    },
    [sourceSize, artwork, onChange],
  );

  const pixels = artwork.width * artwork.height;
  const overLimit = isOverLimit(artwork.width, artwork.height);
  const wasReduced =
    (sourceSize.width > LIMITS.artworkAxis ||
      sourceSize.height > LIMITS.artworkAxis ||
      sourceSize.width * sourceSize.height > LIMITS.artworkPixels) &&
    currentPreset === 'source';

  return (
    <fieldset className="artwork-controls" disabled={disabled}>
      <legend>Artwork size</legend>

      <div
        className="preset-group"
        role="group"
        aria-label="Aspect ratio preset"
      >
        {(
          ['source', 'square', 'landscape', 'portrait', 'custom'] as Preset[]
        ).map((preset) => (
          <label
            key={preset}
            className={`preset-btn${currentPreset === preset ? ' preset-btn--active' : ''}`}
          >
            <input
              type="radio"
              name="artwork-preset"
              value={preset}
              checked={currentPreset === preset}
              disabled={disabled}
              onChange={() => handlePresetChange(preset)}
              className="sr-only"
            />
            {preset === 'source'
              ? 'Source'
              : preset === 'square'
                ? '1∶1'
                : preset === 'landscape'
                  ? '4∶3'
                  : preset === 'portrait'
                    ? '3∶4'
                    : 'Custom'}
          </label>
        ))}
      </div>

      <div className="dimension-row">
        <label htmlFor="aw">W</label>
        <input
          id="aw"
          type="number"
          min={1}
          max={LIMITS.artworkAxis}
          step={1}
          value={wText}
          disabled={disabled}
          aria-label="Artwork width in pixels"
          aria-invalid={invalid ? 'true' : undefined}
          onChange={(e) => setWText(e.currentTarget.value)}
          onBlur={() => {
            if (skipBlur.current) {
              skipBlur.current = false;
              return;
            }
            commitCustom(wText, hText, 'width');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              skipBlur.current = true;
              setWText(artwork.width.toString());
              e.currentTarget.blur();
            }
          }}
        />
        <span aria-hidden="true">×</span>
        <label htmlFor="ah">H</label>
        <input
          id="ah"
          type="number"
          min={1}
          max={LIMITS.artworkAxis}
          step={1}
          value={hText}
          disabled={disabled}
          aria-label="Artwork height in pixels"
          aria-invalid={invalid ? 'true' : undefined}
          onChange={(e) => setHText(e.currentTarget.value)}
          onBlur={() => {
            if (skipBlur.current) {
              skipBlur.current = false;
              return;
            }
            commitCustom(wText, hText, 'height');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              skipBlur.current = true;
              setHText(artwork.height.toString());
              e.currentTarget.blur();
            }
          }}
        />
        <span className="px-label">px</span>
      </div>

      <p className="dimension-note">
        {invalid ? (
          <span className="control-hint--error">
            Enter integers between 1 and {LIMITS.artworkAxis.toLocaleString()}{' '}
            px, at most {(LIMITS.artworkPixels / 1_000_000).toFixed(0)} MP
            total.
          </span>
        ) : overLimit ? (
          <span className="control-hint--error">Exceeds pixel limits.</span>
        ) : (
          <>
            {pixels.toLocaleString()} px
            {wasReduced && (
              <span className="reduced-note"> (reduced to fit limits)</span>
            )}
          </>
        )}
      </p>
    </fieldset>
  );
}
