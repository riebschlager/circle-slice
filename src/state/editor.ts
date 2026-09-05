import type { Size } from '../render/geometry';
import type { EffectSettings } from './settings';
import type { ImportSuccess } from '../images/lifecycle';

/** Status of the current import operation. */
export type ImportStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; requestId: number; isExample: boolean }
  | { kind: 'error'; message: string }
  | { kind: 'ready' };

/** Stable image source owned by the editor. Close bitmap on replacement. */
export interface ImageSource {
  bitmap: ImageBitmap;
  sourceSize: Size;
  artwork: Size;
  /** Null for the bundled example. */
  file: File | null;
}

export interface EditorState {
  image: ImageSource | null;
  settings: Readonly<EffectSettings>;
  importStatus: ImportStatus;
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
  | { type: 'UPDATE_SETTINGS'; settings: Readonly<EffectSettings> };

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
        action.bitmap.close();
        return state;
      }
      // Release the previous bitmap.
      state.image?.bitmap.close();
      return {
        ...state,
        image: {
          bitmap: action.bitmap,
          sourceSize: action.sourceSize,
          artwork: action.artwork,
          file: action.file,
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
      return { ...state, settings: action.settings };

    default:
      return state;
  }
}
