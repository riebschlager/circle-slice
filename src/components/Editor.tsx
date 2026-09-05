import { useCallback, useEffect, useReducer, useRef } from 'react';
import { createPreview } from '../render/preview';
import { DEFAULT_SETTINGS, normalizeSettings } from '../state/settings';
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
import { EffectControls } from './EffectControls';
import { ArtworkControls } from './ArtworkControls';

const INITIAL_STATE: EditorState = {
  image: null,
  settings: DEFAULT_SETTINGS,
  importStatus: { kind: 'idle' },
  viewMode: 'result',
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

  // Update the preview whenever the image, settings, viewMode, or artwork changes.
  useEffect(() => {
    if (!state.image || !previewRef.current) return;
    const { bitmap, sourceSize, artwork } = state.image;

    if (state.viewMode === 'original') {
      // Show the unmodified source: render it with N=1, rotation=0 but no wash/rings.
      // We repurpose the preview controller but pass original source without effect.
      // To show truly unmodified, we draw source directly via a special mode.
      previewRef.current.update({
        source: bitmap,
        sourceSize,
        artwork,
        settings: { slices: 1, rotation: 0 },
        originalOnly: true,
      });
    } else {
      previewRef.current.update({
        source: bitmap,
        sourceSize,
        artwork,
        settings: state.settings,
      });
    }
    // Set aspect ratio on the container.
    if (container.current) {
      container.current.style.aspectRatio = `${artwork.width.toString()} / ${artwork.height.toString()}`;
    }
  }, [state.image, state.settings, state.viewMode]);

  // ─── Bundled example loading ─────────────────────────────────────────────
  useEffect(() => {
    const id = allocateRequestId();
    latestId.current = Math.max(latestId.current, id);
    dispatch({ type: 'IMPORT_START', requestId: id, isExample: true });
    const isLatest = () => latestId.current === id;
    const url = `${import.meta.env.BASE_URL}examples/quadrants.png`;
    void importExample(url, id, isLatest).then((outcome) => {
      if (!outcome) return;
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
  }, []);

  // ─── Import from file ────────────────────────────────────────────────────
  const startFileImport = useCallback((file: File) => {
    const id = allocateRequestId();
    latestId.current = Math.max(latestId.current, id);
    dispatch({ type: 'IMPORT_START', requestId: id, isExample: false });
    const isLatest = () => latestId.current === id;
    void importFile(file, id, isLatest).then((outcome) => {
      if (!outcome) return;
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

  // ─── Settings ────────────────────────────────────────────────────────────
  const handleSettingsChange = useCallback(
    (settings: ReturnType<typeof normalizeSettings>) => {
      dispatch({ type: 'UPDATE_SETTINGS', settings });
    },
    [],
  );

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' });
  }, []);

  const handleArtworkChange = useCallback(
    (artwork: { width: number; height: number }) => {
      dispatch({ type: 'SET_ARTWORK', artwork });
    },
    [],
  );

  // ─── Comparison mode ─────────────────────────────────────────────────────
  const toggleViewMode = useCallback(() => {
    dispatch({
      type: 'SET_VIEW_MODE',
      mode: state.viewMode === 'result' ? 'original' : 'result',
    });
  }, [state.viewMode]);

  // ─── Status text ─────────────────────────────────────────────────────────
  const { importStatus, image, settings, viewMode } = state;
  let statusText: string;
  if (importStatus.kind === 'loading') {
    statusText = importStatus.isExample ? 'Loading example…' : 'Loading image…';
  } else if (importStatus.kind === 'error') {
    statusText = importStatus.message;
  } else if (image) {
    const modeLabel = viewMode === 'original' ? 'Original' : 'Classic';
    statusText = `${modeLabel} · ${settings.slices.toString()} slices · ${settings.rotation.toString()}° · ${image.artwork.width.toString()} × ${image.artwork.height.toString()}`;
  } else {
    statusText = 'Open an image to get started.';
  }

  const isLoading = importStatus.kind === 'loading';
  const hasError = importStatus.kind === 'error';
  const hasImage = image !== null;

  const canvasAriaLabel = image
    ? `Circle Slice effect${viewMode === 'original' ? ' — showing original' : ''}: ${settings.slices.toString()} slices, ${settings.rotation.toString()} degrees per slice, ${image.artwork.width.toString()} by ${image.artwork.height.toString()} pixels`
    : 'Preview canvas — open an image to begin';

  return (
    <>
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="toolbar" role="toolbar" aria-label="Main toolbar">
        <button
          type="button"
          onClick={openPicker}
          disabled={isLoading}
          className="btn-primary"
          aria-busy={isLoading ? 'true' : undefined}
        >
          Open image
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={!hasImage || isLoading}
          className="btn-secondary"
          title="Reset slices and rotation to defaults"
        >
          Reset effect
        </button>

        {/* Download placeholder — implemented in M5 */}
        <button
          type="button"
          disabled={true}
          className="btn-primary btn-download"
          aria-disabled="true"
          title="Download (coming in M5)"
        >
          Download
        </button>
      </div>

      {/* ── Preview ───────────────────────────────────────────────────── */}
      <figure className="example">
        <div
          ref={container}
          className="preview-surface"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          aria-label="Drop an image here or use the Open image button"
        >
          <canvas ref={canvas} role="img" aria-label={canvasAriaLabel} />
          {!hasImage && !isLoading && (
            <div className="canvas-prompt">
              <p>Drop an image here or</p>
              <button type="button" onClick={openPicker} className="btn-open">
                Open image
              </button>
            </div>
          )}
        </div>

        {/* Original/Result comparison toggle */}
        {hasImage && (
          <div className="compare-bar">
            <button
              type="button"
              className={`btn-compare${viewMode === 'original' ? ' btn-compare--active' : ''}`}
              onClick={toggleViewMode}
              aria-pressed={viewMode === 'original'}
            >
              {viewMode === 'original' ? 'Show result' : 'Show original'}
            </button>
          </div>
        )}

        <figcaption>
          <span className="fig-filename">
            {image?.file ? image.file.name : '01 / Bundled example'}
          </span>
          <span
            role="status"
            aria-live="polite"
            className={hasError ? 'status-error' : undefined}
          >
            {statusText}
          </span>
        </figcaption>
      </figure>

      {/* ── Controls panel ────────────────────────────────────────────── */}
      <aside className="controls" aria-label="Image controls">
        <EffectControls
          settings={settings}
          disabled={!hasImage || isLoading}
          onChange={handleSettingsChange}
          onReset={handleReset}
        />

        {image && (
          <ArtworkControls
            artwork={image.artwork}
            sourceSize={image.sourceSize}
            disabled={isLoading}
            onChange={handleArtworkChange}
          />
        )}

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
