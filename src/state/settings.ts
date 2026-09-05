export interface EffectSettings {
  slices: number;
  rotation: number;
}

export const DEFAULT_SETTINGS: Readonly<EffectSettings> = Object.freeze({
  slices: 10,
  rotation: 10,
});

/** Invalid committed values retain the previous value; UI text stays outside state. */
export function normalizeSettings(
  input: Partial<EffectSettings>,
  previous: Readonly<EffectSettings> = DEFAULT_SETTINGS,
): EffectSettings {
  const normalize = (
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
    step: number,
  ) =>
    Number.isFinite(value)
      ? Math.min(max, Math.max(min, Math.round(value! / step) * step))
      : fallback;
  return {
    slices: normalize(input.slices, previous.slices, 1, 50, 1),
    rotation: normalize(input.rotation, previous.rotation, -50, 50, 0.1),
  };
}
