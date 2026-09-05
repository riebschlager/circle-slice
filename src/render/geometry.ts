export interface Size {
  width: number;
  height: number;
}

/** Center the full source over the artwork without cropping its bounds. */
export function coverRect(source: Size, artwork: Size) {
  if (
    ![source.width, source.height, artwork.width, artwork.height].every(
      (value) => Number.isFinite(value) && value > 0,
    )
  ) {
    throw new RangeError(
      'Source and artwork dimensions must be finite and positive',
    );
  }
  const scale = Math.max(
    artwork.width / source.width,
    artwork.height / source.height,
  );
  const width = source.width * scale;
  const height = source.height * scale;
  return {
    x: (artwork.width - width) / 2,
    y: (artwork.height - height) / 2,
    width,
    height,
  };
}
