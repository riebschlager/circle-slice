/**
 * Shared file-input and drag-and-drop pipeline.
 *
 * A single `onFile` callback handles both entry points. Callers are responsible
 * for building the hidden <input> and attaching the drop zone; this module
 * supplies the event handlers that extract and validate a single file from each.
 */

/** Accepted MIME types for the file picker `accept` attribute (hint only). */
export const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

/**
 * Returns the single File from a file <input> change event,
 * or null with an error message when the selection is invalid.
 */
export function fileFromInput(
  event: Event,
): { file: File } | { error: string } | null {
  const input = event.target as HTMLInputElement;
  const files = input.files;
  if (!files || files.length === 0) return null;
  if (files.length > 1) {
    return { error: 'Choose one image at a time.' };
  }
  return { file: files[0]! };
}

/**
 * Returns the single File from a dragover/drop event,
 * or null with an error message when the drop is invalid.
 * Call `event.preventDefault()` before calling this to allow the drop.
 */
export function fileFromDrop(
  event: DragEvent,
): { file: File } | { error: string } | null {
  const dt = event.dataTransfer;
  if (!dt) return null;

  // Prefer items API; fall back to files.
  if (dt.items && dt.items.length > 0) {
    if (dt.items.length > 1) return { error: 'Choose one image at a time.' };
    const item = dt.items[0]!;
    if (item.kind !== 'file')
      return { error: 'Only image files can be dropped here.' };
    const file = item.getAsFile();
    if (!file) return { error: 'Only image files can be dropped here.' };
    return { file };
  }

  // Fallback: dataTransfer.files
  if (dt.files.length === 0) return null;
  if (dt.files.length > 1) return { error: 'Choose one image at a time.' };
  return { file: dt.files[0]! };
}

/**
 * Resets the file input so the same file can be selected again.
 * Must be called after each selection, not just on success.
 */
export function resetFileInput(input: HTMLInputElement) {
  input.value = '';
}
