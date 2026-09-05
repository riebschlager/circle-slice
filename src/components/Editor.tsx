import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createPreview } from '../render/preview';
import { DEFAULT_SETTINGS } from '../state/settings';
import { editorReducer, type EditorState } from '../state/editor';
import {
  allocateRequestId,
  importFile,
  importExample,
} from '../images/lifecycle';
import {
  fileFromInput,
  fileFromDrop,
  resetFileInput,
  ACCEPTED_TYPES,
} from '../images/input';

const INITIAL_STATE: EditorState = {
  image: null,
  settings: DEFAULT_SETTINGS,
  importStatus: { kind: 'idle' },
  latestRequestId: 0,
};

export function Editor() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, dispatch] = useReducer(editorReducer, INITIAL_STATE);
  const latestId = useRef(0);

  // ─── Preview controller ──────────────────────────────────────────────────
  const previewRef = useRef<ReturnType<typeof createPreview> | null>(null);

  useEffect(() => {
    const preview = createPreview(canvas.current!, container.current!);
    previewRef.current = preview;
    return () => {
      preview.dispose();
      previewRef.current = null;
    };
  }, []);

  // Update the preview whenever the image or settings change.
  useEffect(() => {
    if (!state.image || !previewRef.current) return;
    const { bitmap, sourceSize, artwork } = state.image;
    previewRef.current.update({
      source: bitmap,
      sourceSize,
      artwork,
      settings: state.settings,
    });
    // Set aspect ratio on the container.
    if (container.current) {
      container.current.style.aspectRatio = `${artwork.width.toString()} / ${artwork.height.toString()}`;
    }
  }, [state.image, state.settings]);

  // ─── Bundled example loading ─────────────────────────────────────────────
  useEffect(() => {
    const id = allocateRequestId();
    // Sync-update latestId so isLatest sees this id immediately.
    latestId.current = Math.max(latestId.current, id);
    dispatch({ type: 'IMPORT_START', requestId: id, isExample: true });
    const isLatest = () => latestId.current === id;
    const url = `${import.meta.env.BASE_URL}examples/quadrants.png`;
    void importExample(url, id, isLatest).then((outcome) => {
      if (!outcome) return; // superseded
      if (outcome.ok) {
        const { bitmap, sourceSize, artwork, file, requestId } = outcome;
        dispatch({
          type: 'IMPORT_SUCCESS',
          bitmap,
          sourceSize,
          artwork,
          file,
          requestId,
        });
      } else {
        dispatch({
          type: 'IMPORT_FAILURE',
          requestId: id,
          message: outcome.message,
        });
      }
    });
  }, []); // runs once on mount

  // ─── Import from file ────────────────────────────────────────────────────
  const startFileImport = useCallback((file: File) => {
    const id = allocateRequestId();
    latestId.current = Math.max(latestId.current, id);
    dispatch({ type: 'IMPORT_START', requestId: id, isExample: false });
    const isLatest = () => latestId.current === id;
    void importFile(file, id, isLatest).then((outcome) => {
      if (!outcome) return; // superseded
      if (outcome.ok) {
        const {
          bitmap,
          sourceSize,
          artwork,
          file: importedFile,
          requestId,
        } = outcome;
        dispatch({
          type: 'IMPORT_SUCCESS',
          bitmap,
          sourceSize,
          artwork,
          file: importedFile,
          requestId,
        });
      } else {
        dispatch({
          type: 'IMPORT_FAILURE',
          requestId: id,
          message: outcome.message,
        });
      }
    });
  }, []);

  // ─── File picker ─────────────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const result = fileFromInput(e.nativeEvent);
      resetFileInput(e.currentTarget);
      if (!result) return;
      if ('error' in result) {
        dispatch({
          type: 'IMPORT_FAILURE',
          requestId: latestId.current,
          message: result.error,
        });
        return;
      }
      startFileImport(result.file);
    },
    [startFileImport],
  );

  const openPicker = useCallback(() => {
    fileInput.current?.click();
  }, []);

  // ─── Drag and drop ───────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const result = fileFromDrop(e.nativeEvent as DragEvent);
      if (!result) return;
      if ('error' in result) {
        dispatch({
          type: 'IMPORT_FAILURE',
          requestId: latestId.current,
          message: result.error,
        });
        return;
      }
      startFileImport(result.file);
    },
    [startFileImport],
  );

  // ─── Status text ─────────────────────────────────────────────────────────
  const { importStatus, image, settings } = state;
  let statusText: string;
  if (importStatus.kind === 'loading') {
    statusText = importStatus.isExample ? 'Loading example…' : 'Loading image…';
  } else if (importStatus.kind === 'error') {
    statusText = importStatus.message;
  } else if (image) {
    statusText = `Classic · ${settings.slices.toString()} slices · ${settings.rotation.toString()}° · ${image.artwork.width.toString()} × ${image.artwork.height.toString()}`;
  } else {
    statusText = 'Open an image to get started.';
  }

  const isLoading = importStatus.kind === 'loading';
  const hasError = importStatus.kind === 'error';

  return (
    <>
      <figure className="example">
        <div
          ref={container}
          className="preview-surface"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          aria-label="Drop an image here or use the Open image button"
        >
          <canvas
            ref={canvas}
            role="img"
            aria-label={
              image
                ? `Circle Slice effect: ${settings.slices.toString()} slices, ${settings.rotation.toString()} degrees per slice, ${image.artwork.width.toString()} by ${image.artwork.height.toString()} pixels`
                : 'Preview canvas — open an image to begin'
            }
          />
          {!image && !isLoading && (
            <div className="canvas-prompt">
              <p>Drop an image here or</p>
              <button type="button" onClick={openPicker} className="btn-open">
                Open image
              </button>
            </div>
          )}
        </div>
        <figcaption>
          <span>{image?.file ? image.file.name : '01 / Bundled example'}</span>
          <span
            role="status"
            aria-live="polite"
            className={hasError ? 'status-error' : undefined}
          >
            {statusText}
          </span>
        </figcaption>
      </figure>

      <aside className="controls" aria-label="Image controls">
        <button
          type="button"
          onClick={openPicker}
          disabled={isLoading}
          className="btn-primary"
          aria-busy={isLoading}
        >
          Open image
        </button>
        <p className="privacy-note">
          Your images stay on your device. Processing happens in this browser.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_TYPES}
          className="sr-only"
          aria-label="Choose an image file"
          onChange={handleInputChange}
        />
      </aside>
    </>
  );
}
