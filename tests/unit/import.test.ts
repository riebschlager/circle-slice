import { expect, it, describe } from 'vitest';
import {
  classifyDecodeError,
  decodeErrorMessage,
} from '../../src/images/decode';
import { fileFromInput, fileFromDrop } from '../../src/images/input';
import { allocateRequestId } from '../../src/images/lifecycle';
import {
  editorReducer,
  type EditorState,
  type EditorAction,
  type ImageSource,
} from '../../src/state/editor';
import { DEFAULT_SETTINGS } from '../../src/state/settings';

// ─── decode helpers ──────────────────────────────────────────────────────────

describe('classifyDecodeError', () => {
  it('returns the embedded kind for known decode errors', () => {
    expect(classifyDecodeError({ __decodeError: 'too-large' })).toBe(
      'too-large',
    );
    expect(classifyDecodeError({ __decodeError: 'unsupported-format' })).toBe(
      'unsupported-format',
    );
  });

  it('returns unknown for arbitrary thrown values', () => {
    expect(classifyDecodeError(new Error('random'))).toBe('unknown');
    expect(classifyDecodeError(null)).toBe('unknown');
    expect(classifyDecodeError('string error')).toBe('unknown');
  });
});

describe('decodeErrorMessage', () => {
  const fakeFile = { name: 'photo.HEIC' } as File;
  it('includes the filename in every message', () => {
    for (const kind of [
      'too-large',
      'too-many-pixels',
      'axis-too-long',
      'unsupported-format',
      'corrupt',
      'unknown',
    ] as const) {
      expect(decodeErrorMessage(kind, fakeFile)).toContain('photo.HEIC');
    }
  });

  it('mentions HEIC/HEIF in the unsupported-format message', () => {
    expect(decodeErrorMessage('unsupported-format', fakeFile)).toMatch(/HEIC/i);
  });
});

// ─── input extraction ────────────────────────────────────────────────────────
// These use plain object stubs so the tests remain in the node environment.

describe('fileFromInput', () => {
  function makeInputEvent(files: File[]): Event {
    const fileList = Object.assign(
      Object.create({}) as Record<string, unknown>,
      { length: files.length },
      Object.fromEntries(files.map((f, i) => [i, f])),
    );
    const input = { files: fileList };
    return { target: input } as unknown as Event;
  }

  it('returns null when no files are selected', () => {
    const result = fileFromInput(makeInputEvent([]));
    expect(result).toBeNull();
  });

  it('returns an error for multiple files', () => {
    const a = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const b = new File(['x'], 'b.jpg', { type: 'image/jpeg' });
    const result = fileFromInput(makeInputEvent([a, b]));
    expect(result).toEqual({ error: expect.stringContaining('one') });
  });

  it('returns the file for a single valid selection', () => {
    const f = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const result = fileFromInput(makeInputEvent([f]));
    expect(result).toEqual({ file: f });
  });
});

describe('fileFromDrop', () => {
  function makeDrop(items?: { kind: string; file: File | null }[]): DragEvent {
    const dataTransfer = {
      items: items?.map((i) => ({
        kind: i.kind,
        getAsFile: () => i.file,
      })),
      files: {
        length: items?.filter((i) => i.kind === 'file').length ?? 0,
        0: items?.find((i) => i.kind === 'file')?.file,
      },
    };
    return { dataTransfer } as unknown as DragEvent;
  }

  it('returns null for an empty drop', () => {
    const event = makeDrop([]);
    expect(fileFromDrop(event)).toBeNull();
  });

  it('returns an error for multiple files dropped', () => {
    const a = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const b = new File(['x'], 'b.jpg', { type: 'image/jpeg' });
    const event = makeDrop([
      { kind: 'file', file: a },
      { kind: 'file', file: b },
    ]);
    expect(fileFromDrop(event)).toEqual({
      error: expect.stringContaining('one'),
    });
  });

  it('returns an error for a non-file item', () => {
    const event = makeDrop([{ kind: 'string', file: null }]);
    expect(fileFromDrop(event)).toEqual({ error: expect.any(String) });
  });

  it('returns the file for a single file drop', () => {
    const f = new File(['x'], 'photo.png', { type: 'image/png' });
    const event = makeDrop([{ kind: 'file', file: f }]);
    expect(fileFromDrop(event)).toEqual({ file: f });
  });
});

// ─── request IDs ────────────────────────────────────────────────────────────

describe('allocateRequestId', () => {
  it('returns monotonically increasing IDs', () => {
    const a = allocateRequestId();
    const b = allocateRequestId();
    const c = allocateRequestId();
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

// ─── editor reducer ──────────────────────────────────────────────────────────

function makeImage(overrides?: Partial<ImageSource>): ImageSource {
  return {
    bitmap: {
      close: () => undefined,
      width: 800,
      height: 600,
    } as unknown as ImageBitmap,
    sourceSize: { width: 800, height: 600 },
    artwork: { width: 800, height: 600 },
    file: null,
    ...overrides,
  };
}

function baseState(overrides?: Partial<EditorState>): EditorState {
  return {
    image: null,
    settings: DEFAULT_SETTINGS,
    exportSettings: { format: 'png', quality: 0.92 },
    importStatus: { kind: 'idle' },
    exportStatus: { kind: 'idle' },
    viewMode: 'result',
    latestRequestId: 0,
    ...overrides,
  };
}

describe('editorReducer', () => {
  it('IMPORT_START advances latestRequestId and sets loading status', () => {
    const action: EditorAction = {
      type: 'IMPORT_START',
      requestId: 5,
      isExample: false,
    };
    const next = editorReducer(baseState(), action);
    expect(next.latestRequestId).toBe(5);
    expect(next.importStatus).toEqual({
      kind: 'loading',
      requestId: 5,
      isExample: false,
    });
  });

  it('IMPORT_SUCCESS replaces the image and sets ready status', () => {
    const bitmap = { close: () => undefined } as unknown as ImageBitmap;
    const action: EditorAction = {
      type: 'IMPORT_SUCCESS',
      requestId: 1,
      bitmap,
      sourceSize: { width: 800, height: 600 },
      artwork: { width: 800, height: 600 },
      file: null,
    };
    const next = editorReducer(baseState({ latestRequestId: 1 }), action);
    expect(next.image?.bitmap).toBe(bitmap);
    expect(next.importStatus).toEqual({ kind: 'ready' });
  });

  it('IMPORT_SUCCESS is discarded when a newer request exists', () => {
    const closed: unknown[] = [];
    const staleBitmap = {
      close: () => closed.push('stale'),
    } as unknown as ImageBitmap;
    const action: EditorAction = {
      type: 'IMPORT_SUCCESS',
      requestId: 1,
      bitmap: staleBitmap,
      sourceSize: { width: 800, height: 600 },
      artwork: { width: 800, height: 600 },
      file: null,
    };
    // latestRequestId is 2, so requestId 1 is stale.
    const state = baseState({ latestRequestId: 2 });
    const next = editorReducer(state, action);
    expect(next).toBe(state); // no change
    expect(closed).toEqual(['stale']); // stale bitmap was closed
  });

  it('IMPORT_SUCCESS closes the previously owned bitmap', () => {
    const closed: unknown[] = [];
    const oldBitmap = {
      close: () => closed.push('old'),
    } as unknown as ImageBitmap;
    const newBitmap = { close: () => undefined } as unknown as ImageBitmap;
    const state = baseState({
      image: makeImage({ bitmap: oldBitmap }),
      latestRequestId: 2,
    });
    const action: EditorAction = {
      type: 'IMPORT_SUCCESS',
      requestId: 2,
      bitmap: newBitmap,
      sourceSize: { width: 640, height: 480 },
      artwork: { width: 640, height: 480 },
      file: null,
    };
    editorReducer(state, action);
    expect(closed).toEqual(['old']);
  });

  it('IMPORT_FAILURE sets the error message when current', () => {
    const state = baseState({ latestRequestId: 3 });
    const next = editorReducer(state, {
      type: 'IMPORT_FAILURE',
      requestId: 3,
      message: 'Something went wrong.',
    });
    expect(next.importStatus).toEqual({
      kind: 'error',
      message: 'Something went wrong.',
    });
  });

  it('IMPORT_FAILURE is discarded when stale', () => {
    const state = baseState({ latestRequestId: 5 });
    const next = editorReducer(state, {
      type: 'IMPORT_FAILURE',
      requestId: 3,
      message: 'Old error',
    });
    expect(next).toBe(state);
  });

  it('failed replacement preserves the existing image', () => {
    const existingImage = makeImage();
    const state = baseState({ image: existingImage, latestRequestId: 2 });
    const next = editorReducer(state, {
      type: 'IMPORT_FAILURE',
      requestId: 2,
      message: 'Corrupt file.',
    });
    expect(next.image).toBe(existingImage);
    expect(next.importStatus).toEqual({
      kind: 'error',
      message: 'Corrupt file.',
    });
  });

  it('UPDATE_SETTINGS replaces settings only', () => {
    const state = baseState();
    const next = editorReducer(state, {
      type: 'UPDATE_SETTINGS',
      settings: { slices: 25, rotation: -10 },
    });
    expect(next.settings).toEqual({ slices: 25, rotation: -10 });
    expect(next.image).toBeNull();
  });
});
