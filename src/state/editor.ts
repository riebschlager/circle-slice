import type { DecodedImage } from '../images/decode';
import { assertArtworkSize } from '../render/sizing';
import type { Size } from '../render/geometry';
import {
  type EffectSettings,
  DEFAULT_SETTINGS,
  normalizeSettings,
} from './settings';
import type { ImportSuccess } from '../images/lifecycle';
import type { ExportFormat } from '../export/filename';

/** Status of the current import operation. */
export type ImportStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; requestId: number; isExample: boolean }
  | { kind: 'error'; message: string }
  | { kind: 'ready' };

/** Which canvas the preview currently shows. Export always uses the effect. */
export type ViewMode = 'result' | 'original';

/** Status of the current export operation. */
export type ExportStatus =
  { kind: 'idle' } | { kind: 'exporting' } | { kind: 'error'; message: string };

/** Export format and quality settings, held separately from effect settings. */
export interface ExportSettings {
  format: ExportFormat;
  /** 0–1. Only applied for JPEG. */
  quality: number;
}

export const DEFAULT_EXPORT_SETTINGS: Readonly<ExportSettings> = Object.freeze({
  format: 'png',
  quality: 0.92,
});

/** Stable image source owned by the editor. Close bitmap on replacement. */
export interface ImageSource {
  bitmap: DecodedImage;
  sourceSize: Size;
  artwork: Size;
  /** Null for the bundled example. */
  file: File | null;
  sourceBlob?: Blob | undefined;
}

export interface EditorState {
  image: ImageSource | null;
  settings: Readonly<EffectSettings>;
  exportSettings: Readonly<ExportSettings>;
  importStatus: ImportStatus;
  exportStatus: ExportStatus;
  viewMode: ViewMode;
  /** The highest request ID that has been allocated, used by isLatest(). */
  latestRequestId: number;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type EditorAction =
  | { type: 'IMPORT_START'; requestId: number; isExample: boolean }
  | ({ type: 'IMPORT_SUCCESS' } & ImportSuccess)
  | { type: 'IMPORT_FAILURE'; requestId: number; message: string }
  | { type: 'UPDATE_SETTINGS'; settings: Readonly<EffectSettings> }
  | { type: 'RESET_SETTINGS' }
  | { type: 'SET_ARTWORK'; artwork: Size }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'UPDATE_EXPORT_SETTINGS'; exportSettings: Readonly<ExportSettings> }
  | { type: 'EXPORT_START' }
  | { type: 'EXPORT_SUCCESS' }
  | { type: 'EXPORT_FAILURE'; message: string }
  | { type: 'EXPORT_RESET' };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case 'IMPORT_START':
      return {
        ...state,
        latestRequestId: Math.max(state.latestRequestId, action.requestId),
        importStatus: {
          kind: 'loading',
          requestId: action.requestId,
          isExample: action.isExample,
        },
      };

    case 'IMPORT_SUCCESS': {
      // Drop stale completions.
      if (action.requestId < state.latestRequestId) {
        return state;
      }
      return {
        ...state,
        image: {
          bitmap: action.bitmap,
          sourceSize: action.sourceSize,
          artwork: action.artwork,
          file: action.file,
          sourceBlob: action.sourceBlob,
        },
        importStatus: { kind: 'ready' },
      };
    }

    case 'IMPORT_FAILURE': {
      // Drop stale failures.
      if (action.requestId < state.latestRequestId) return state;
      return {
        ...state,
        importStatus: { kind: 'error', message: action.message },
      };
    }

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: normalizeSettings(action.settings, state.settings),
      };

    case 'RESET_SETTINGS':
      return { ...state, settings: DEFAULT_SETTINGS };

    case 'SET_ARTWORK': {
      if (!state.image) return state;
      try {
        assertArtworkSize(action.artwork);
      } catch {
        return state;
      }
      return {
        ...state,
        image: { ...state.image, artwork: action.artwork },
      };
    }

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };

    case 'UPDATE_EXPORT_SETTINGS':
      return {
        ...state,
        exportSettings: {
          format: action.exportSettings.format === 'jpeg' ? 'jpeg' : 'png',
          quality: Number.isFinite(action.exportSettings.quality)
            ? Math.min(1, Math.max(0, action.exportSettings.quality))
            : state.exportSettings.quality,
        },
      };

    case 'EXPORT_START':
      return { ...state, exportStatus: { kind: 'exporting' } };

    case 'EXPORT_SUCCESS':
      return { ...state, exportStatus: { kind: 'idle' } };

    case 'EXPORT_FAILURE':
      return {
        ...state,
        exportStatus: { kind: 'error', message: action.message },
      };

    case 'EXPORT_RESET':
      return { ...state, exportStatus: { kind: 'idle' } };

    default:
      return state;
  }
}
