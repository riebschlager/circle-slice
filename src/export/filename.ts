/**
 * Produce a safe download filename from an optional source name.
 *
 * Pattern: <basename>-circle-slice-WxH.<ext>
 * "Safe" means no path separators, control characters, or HTML-sensitive chars;
 * max 200 chars total before adding the suffix.
 */

// eslint-disable-next-line no-control-regex
const UNSAFE = /[<>"'/\\|?*\x00-\x1f]/g;
const MULTI_DASH = /-{2,}/g;
const LEADING_TRAILING = /^[-.\s]+|[-.\s]+$/g;

function sanitizeBasename(raw: string): string {
  // Strip extension
  const dotIdx = raw.lastIndexOf('.');
  const withoutExt = dotIdx > 0 ? raw.slice(0, dotIdx) : raw;
  return (
    withoutExt
      .replace(UNSAFE, '-')
      .replace(MULTI_DASH, '-')
      .replace(LEADING_TRAILING, '')
      .slice(0, 200)
      .replace(LEADING_TRAILING, '') || // trim again after slice
    'image'
  );
}

export type ExportFormat = 'png' | 'jpeg';

export function makeFilename(
  sourceFile: File | null,
  artwork: { width: number; height: number },
  format: ExportFormat,
): string {
  const base = sourceFile
    ? sanitizeBasename(sourceFile.name)
    : 'circle-slice-example';
  const suffix = `-circle-slice-${artwork.width.toString()}x${artwork.height.toString()}`;
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  return `${base}${suffix}.${ext}`;
}
