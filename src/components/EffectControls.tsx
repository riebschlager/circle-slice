import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeSettings, type EffectSettings } from '../state/settings';

interface Props {
  settings: Readonly<EffectSettings>;
  disabled?: boolean;
  onChange: (settings: Readonly<EffectSettings>) => void;
  onReset: () => void;
}

interface Field {
  key: keyof EffectSettings;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const FIELDS: Field[] = [
  {
    key: 'slices',
    label: 'Slices',
    hint: 'Number of concentric circles',
    min: 1,
    max: 50,
    step: 1,
    unit: '',
  },
  {
    key: 'rotation',
    label: 'Rotation per slice',
    hint: 'Each inner circle turns another',
    min: -50,
    max: 50,
    step: 0.1,
    unit: '°',
  },
];

/**
 * Paired range + number inputs for each effect setting.
 * Allows incomplete text while editing; normalizes on commit.
 * A null draft means the field is tracking the committed value.
 */
export function EffectControls({
  settings,
  disabled,
  onChange,
  onReset,
}: Props) {
  // Per-field draft text — null means display the committed value.
  const [drafts, setDrafts] = useState<
    Record<keyof EffectSettings, string | null>
  >({
    slices: null,
    rotation: null,
  });
  // Track last validation-failed fields for inline messages.
  const [invalid, setInvalid] = useState<
    Partial<Record<keyof EffectSettings, true>>
  >({});
  const skipBlur = useRef(false);

  // Sync drafts back to null when external settings change (e.g. Reset).
  const prevSettings = useRef(settings);
  useEffect(() => {
    if (prevSettings.current !== settings) {
      prevSettings.current = settings;
      setDrafts({ slices: null, rotation: null });
      setInvalid({});
    }
  }, [settings]);

  const commitField = useCallback(
    (key: keyof EffectSettings, raw: string) => {
      const parsed = raw.trim() ? Number(raw) : NaN;
      const normalized = normalizeSettings(
        { ...settings, [key]: parsed },
        settings,
      );
      if (!Number.isFinite(parsed)) {
        // Revert and show a brief invalid hint.
        setInvalid((prev) => ({ ...prev, [key]: true }));
        setDrafts((prev) => ({ ...prev, [key]: null }));
        return;
      }
      setInvalid((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setDrafts((prev) => ({ ...prev, [key]: null }));
      onChange(normalized);
    },
    [settings, onChange],
  );

  return (
    <fieldset className="effect-controls" disabled={disabled}>
      <legend>Effect</legend>
      {FIELDS.map((field) => {
        const committed = settings[field.key];
        const draft = drafts[field.key];
        const displayValue = draft ?? committed.toString();
        const isInvalid = invalid[field.key];
        const inputId = `field-${field.key}`;
        const hintId = `hint-${field.key}`;
        return (
          <div className="control-row" key={field.key}>
            <label htmlFor={inputId}>{field.label}</label>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={committed}
              disabled={disabled}
              aria-label={field.label}
              onChange={(e) => {
                const v = parseFloat(e.currentTarget.value);
                onChange(
                  normalizeSettings({ ...settings, [field.key]: v }, settings),
                );
              }}
            />
            <span className="number-wrap">
              <input
                id={inputId}
                type="number"
                min={field.min}
                max={field.max}
                step={field.step}
                value={displayValue}
                aria-describedby={hintId}
                aria-invalid={isInvalid ? 'true' : undefined}
                disabled={disabled}
                onChange={(e) => {
                  setDrafts((prev) => ({
                    ...prev,
                    [field.key]: e.currentTarget.value,
                  }));
                }}
                onBlur={(e) => {
                  if (skipBlur.current) {
                    skipBlur.current = false;
                    return;
                  }
                  commitField(field.key, e.currentTarget.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    skipBlur.current = true;
                    setDrafts((prev) => ({ ...prev, [field.key]: null }));
                    e.currentTarget.blur();
                  }
                }}
              />
              {field.unit && <span aria-hidden="true">{field.unit}</span>}
            </span>
            <span
              id={hintId}
              className={`control-hint${isInvalid ? ' control-hint--error' : ''}`}
            >
              {isInvalid
                ? `Enter a number between ${field.min.toString()} and ${field.max.toString()}`
                : field.key === 'rotation'
                  ? `Each inner circle turns another ${committed.toString()}°`
                  : field.hint}
            </span>
          </div>
        );
      })}
      <button
        type="button"
        className="btn-secondary"
        onClick={onReset}
        disabled={disabled}
      >
        Reset effect
      </button>
    </fieldset>
  );
}
