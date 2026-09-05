/**
 * Trigger a file download in the browser using an object URL and an anchor element.
 *
 * The object URL is revoked after the click event is dispatched, which is safe
 * because the browser retains the blob reference during the download.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  try {
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
  } finally {
    a.remove();
    // Defer revocation slightly so the browser can initiate the download.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
