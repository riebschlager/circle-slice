import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { createPreview } from '../render/preview';
import { DEFAULT_SETTINGS, normalizeSettings } from '../state/settings';
import {
  editorReducer,
  type EditorState,
  DEFAULT_EXPORT_SETTINGS,
} from '../state/editor';
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
import { ExportControls } from './ExportControls';
import { renderExport } from '../export/render';
import { makeFilename } from '../export/filename';
import { downloadBlob } from '../export/download';
import { decodeImageFile, type DecodedImage } from '../images/decode';

const INITIAL_STATE: EditorState = {
  image: null,
  settings: DEFAULT_SETTINGS,
  exportSettings: DEFAULT_EXPORT_SETTINGS,
  importStatus: { kind: 'idle' },
  exportStatus: { kind: 'idle' },
  viewMode: 'result',
  latestRequestId: 0,
};

export function Editor() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, dispatch] = useReducer(editorReducer, INITIAL_STATE);
  const latestId = useRef(0);
  const ownedBitmaps = useRef(new Set<DecodedImage>());
  const mounted = useRef(false);
  const exportBusy = useRef(false);
  const pendingExport = useRef<{
    frame: number;
    source: Promise<{ bitmap: DecodedImage | null }>;
  } | null>(null);
  const [download, setDownload] = useState<{
    url: string;
    filename: string;
  } | null>(null);
  useEffect(
    () => () => {
      if (download) URL.revokeObjectURL(download.url);
    },
    [download],
  );
  useEffect(() => {
    mounted.current = true;
    const owned = ownedBitmaps.current;
    return () => {
      mounted.current = false;
      latestId.current = allocateRequestId();
      for (const bitmap of owned) bitmap.close();
      owned.clear();
      const pending = pendingExport.current;
      if (pending) {
        cancelAnimationFrame(pending.frame);
        void pending.source.then(({ bitmap }) => bitmap?.close());
        pendingExport.current = null;
      }
    };
  }, []);

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
  useLayoutEffect(() => {
    if (!state.image || !previewRef.current) return;
    const { bitmap, sourceSize, artwork } = state.image;

    if (state.viewMode === 'original') {
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
    for (const owned of ownedBitmaps.current) {
      if (owned !== bitmap) {
        owned.close();
        ownedBitmaps.current.delete(owned);
      }
    }
    // Set aspect ratio on the container.
    if (container.current) {
      container.current.style.setProperty(
        '--artwork-ratio',
        String(artwork.width / artwork.height),
      );
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
        ownedBitmaps.current.add(outcome.bitmap);
        const { bitmap, sourceSize, artwork, file, sourceBlob, requestId } =
          outcome;
        dispatch({
          type: 'IMPORT_SUCCESS',
          bitmap,
          sourceSize,
          artwork,
          file,
          sourceBlob,
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
        ownedBitmaps.current.add(outcome.bitmap);
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

  // ─── Export settings ─────────────────────────────────────────────────────
  const handleExportSettingsChange = useCallback(
    (exportSettings: Readonly<import('../state/editor').ExportSettings>) => {
      dispatch({ type: 'UPDATE_EXPORT_SETTINGS', exportSettings });
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

  // ─── Download ────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const { image, settings, exportSettings, exportStatus } = state;
    if (!image || exportStatus.kind === 'exporting' || exportBusy.current)
      return;
    exportBusy.current = true;

    // Snapshot the source and settings at the moment of click.
    // Subsequent edits/imports must not alter the in-flight result.
    // Start acquiring an independent source before replacement can dispose the preview.
    const sourceFile =
      image.file ??
      new File([image.sourceBlob!], 'example.png', { type: 'image/png' });
    const sourcePromise = decodeImageFile(sourceFile).then(
      ({ bitmap }) => bitmap,
    );
    // Attach rejection handling immediately, even if the tab delays animation frames.
    const sourceResult = sourcePromise.then(
      (bitmap) => ({ bitmap, error: null }),
      (error: unknown) => ({ bitmap: null, error }),
    );
    const snapshotSourceSize = { ...image.sourceSize };
    const snapshotArtwork = { ...image.artwork };
    const snapshotSettings = { ...settings };
    const snapshotExportSettings = { ...exportSettings };
    const snapshotFile = image.file;

    dispatch({ type: 'EXPORT_START' });

    // Yield a frame so the "Preparing download…" busy state can paint.
    const frame = requestAnimationFrame(() => {
      pendingExport.current = null;
      void (async () => {
        const source = await sourceResult;
        try {
          if (!source.bitmap) throw source.error;
          if (!mounted.current) return;
          const result = await renderExport({
            input: {
              source: source.bitmap,
              sourceSize: snapshotSourceSize,
              artwork: snapshotArtwork,
              settings: snapshotSettings,
            },
            format: snapshotExportSettings.format,
            quality: snapshotExportSettings.quality,
          });

          const filename = makeFilename(
            snapshotFile,
            snapshotArtwork,
            snapshotExportSettings.format,
          );

          if (!mounted.current) return;
          setDownload({ url: URL.createObjectURL(result.blob), filename });
          downloadBlob(result.blob, filename);
          dispatch({ type: 'EXPORT_SUCCESS' });
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Export failed. Try a different format or smaller dimensions.';
          if (mounted.current) dispatch({ type: 'EXPORT_FAILURE', message });
        } finally {
          source.bitmap?.close();
          exportBusy.current = false;
        }
      })();
    });
    pendingExport.current = { frame, source: sourceResult };
  }, [state]);

  const handleExportReset = useCallback(() => {
    dispatch({ type: 'EXPORT_RESET' });
  }, []);

  // ─── Status text ─────────────────────────────────────────────────────────
  const {
    importStatus,
    exportStatus,
    image,
    settings,
    viewMode,
    exportSettings,
  } = state;
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
  const isExporting = exportStatus.kind === 'exporting';
  const hasError = importStatus.kind === 'error';
  const hasExportError = exportStatus.kind === 'error';
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

        <button
          type="button"
          onClick={handleDownload}
          disabled={!hasImage || isLoading || isExporting}
          className="btn-primary btn-download"
          aria-busy={isExporting ? 'true' : undefined}
          aria-disabled={
            !hasImage || isLoading || isExporting ? 'true' : undefined
          }
        >
          {isExporting ? 'Preparing…' : 'Download'}
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
            aria-live="off"
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

        <ExportControls
          exportSettings={exportSettings}
          disabled={!hasImage || isLoading || isExporting}
          onChange={handleExportSettingsChange}
        />

        {download && (
          <a href={download.url} download={download.filename}>
            Download again
          </a>
        )}

        {/* Export status */}
        {(isExporting || hasExportError) && (
          <div
            role="status"
            aria-live="polite"
            className={`export-status${hasExportError ? ' export-status--error' : ''}`}
          >
            {isExporting && 'Preparing download…'}
            {hasExportError && (
              <>
                <span>
                  {exportStatus.kind === 'error' ? exportStatus.message : ''}
                </span>
                <button
                  type="button"
                  className="btn-secondary export-retry"
                  onClick={handleExportReset}
                >
                  Dismiss
                </button>
              </>
            )}
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {importStatus.kind === 'ready'
            ? `Loaded ${image?.file?.name ?? 'bundled example'}.`
            : importStatus.kind === 'loading' || importStatus.kind === 'error'
              ? statusText
              : ''}
        </span>
        <span className="sr-only" aria-live="polite">
          {download && exportStatus.kind === 'idle'
            ? 'Download ready. Use Download again if it did not start.'
            : ''}
        </span>

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
