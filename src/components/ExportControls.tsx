import { useCallback } from 'react';
import type { ExportSettings } from '../state/editor';

interface Props {
  exportSettings: Readonly<ExportSettings>;
  disabled?: boolean;
  onChange: (settings: Readonly<ExportSettings>) => void;
}

const QUALITY_STEPS = [0.5, 0.7, 0.8, 0.85, 0.9, 0.92, 0.95, 0.99, 1.0];

export function ExportControls({ exportSettings, disabled, onChange }: Props) {
  const handleFormatChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const format = e.currentTarget.value as ExportSettings['format'];
      onChange({ ...exportSettings, format });
    },
    [exportSettings, onChange],
  );

  const handleQualityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const quality = parseFloat(e.currentTarget.value);
      if (Number.isFinite(quality)) {
        onChange({ ...exportSettings, quality });
      }
    },
    [exportSettings, onChange],
  );

  const isJpeg = exportSettings.format === 'jpeg';

  return (
    <fieldset className="export-controls" disabled={disabled}>
      <legend>Export</legend>

      <div className="control-row">
        <span className="control-label">Format</span>
        <div className="radio-group" role="group" aria-label="Export format">
          <label className="radio-label">
            <input
              type="radio"
              name="export-format"
              value="png"
              checked={exportSettings.format === 'png'}
              disabled={disabled}
              onChange={handleFormatChange}
            />
            PNG
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="export-format"
              value="jpeg"
              checked={isJpeg}
              disabled={disabled}
              onChange={handleFormatChange}
            />
            JPEG
          </label>
        </div>
        <span className="control-hint">
          {isJpeg
            ? 'JPEG composites a white background'
            : 'PNG preserves transparency'}
        </span>
      </div>

      {isJpeg && (
        <div className="control-row">
          <label htmlFor="export-quality">Quality</label>
          <input
            id="export-quality"
            type="range"
            min={0.5}
            max={1.0}
            step={0.01}
            value={exportSettings.quality}
            disabled={disabled}
            onChange={handleQualityChange}
            list="quality-datalist"
            aria-valuetext={`${Math.round(exportSettings.quality * 100).toString()}%`}
          />
          <datalist id="quality-datalist">
            {QUALITY_STEPS.map((q) => (
              <option key={q} value={q} />
            ))}
          </datalist>
          <span className="control-hint quality-value">
            {Math.round(exportSettings.quality * 100).toString()}%
          </span>
        </div>
      )}
    </fieldset>
  );
}
