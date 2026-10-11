import { Script, createContext } from 'node:vm';
import { DEFAULT_TILE_URL, mapDocument } from '../src/features/maps/mapDocument';
import {
  createNativeTileLoader,
  MAP_USER_AGENT,
  matchesTileTemplate,
} from '../src/features/maps/nativeTileLoader';
import { clampSheetHeight, shouldExpandSheet } from '../src/features/maps/sheetGestures';

const TILE = 'https://tile.openstreetmap.org/15/26236/14910.png';
const DATA = 'data:image/png;base64,aGVsbG8=';
const flush = () =>
  new Promise<void>((resolve) =>
    jest.requireActual<typeof import('node:timers')>('node:timers').setImmediate(resolve),
  );

describe('Native raster fallback', () => {
  afterEach(() => jest.useRealTimers());
  it.each([
    'https://evil.test/15/26236/14910.png',
    `${TILE}?redirect=elsewhere`,
    'https://tile.openstreetmap.org/api/users',
    'http://tile.openstreetmap.org/15/26236/14910.png',
    'https://tile.openstreetmap.org/99/0/0.png',
    'https://tile.openstreetmap.org/1/99/0.png',
    'https://tile.openstreetmap.org/1/0/99.png',
  ])('rejects non-tile or out-of-range bridge requests: %s', (url) => {
    expect(matchesTileTemplate(url, DEFAULT_TILE_URL)).toBe(false);
  });
  it('accepts only coordinates from the configured XYZ template, including its query string', () => {
    expect(matchesTileTemplate(TILE, DEFAULT_TILE_URL)).toBe(true);
    const template = 'https://tiles.example.org/{z}/{y}/{x}.png?key=public';
    expect(matchesTileTemplate('https://tiles.example.org/15/14910/26236.png?key=public', template)).toBe(
      true,
    );
    expect(matchesTileTemplate('https://tiles.example.org/15/14910/26236.png?key=other', template)).toBe(
      false,
    );
  });
  it('uses identified native requests, leaves HTTP cache policy intact, and releases image memory', async () => {
    const close = jest.fn();
    const blob = Object.assign(new Blob(['image'], { type: 'image/png' }), { close });
    const fetcher = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/png' }),
      blob: async () => blob,
    });
    const readDataUrl = jest.fn().mockResolvedValue(DATA);
    const deliver = jest.fn();
    const loader = createNativeTileLoader(DEFAULT_TILE_URL, deliver, { fetch: fetcher, readDataUrl });
    loader.request('tile-1', TILE);
    await flush();
    expect(fetcher).toHaveBeenCalledWith(
      TILE,
      expect.objectContaining({
        credentials: 'omit',
        headers: { 'User-Agent': MAP_USER_AGENT, Accept: 'image/png,image/jpeg,image/webp' },
      }),
    );
    expect(fetcher.mock.calls[0][1]).not.toHaveProperty('cache');
    expect(deliver).toHaveBeenCalledWith({ type: 'nativeTile', id: 'tile-1', data: DATA });
    expect(close).toHaveBeenCalledTimes(1);
    loader.dispose();
  });
  it.each([403, 404, 429, 503])('reports HTTP %i without repeated retries or fake tiles', async (status) => {
    const fetcher = jest.fn().mockResolvedValue(new Response('', { status }));
    const deliver = jest.fn();
    const loader = createNativeTileLoader(DEFAULT_TILE_URL, deliver, {
      fetch: fetcher,
      readDataUrl: jest.fn(),
    });
    loader.request('tile-1', TILE);
    await flush();
    expect(deliver).toHaveBeenCalledWith({ type: 'nativeTile', id: 'tile-1', reason: 'http', status });
    expect(fetcher).toHaveBeenCalledTimes(1);
    loader.dispose();
  });
  it.each([
    new Headers({ 'content-type': 'text/html' }),
    new Headers({ 'content-type': 'image/png', 'content-length': '1000000' }),
  ])('rejects non-images and oversized responses', async (headers) => {
    const deliver = jest.fn();
    const loader = createNativeTileLoader(DEFAULT_TILE_URL, deliver, {
      fetch: jest.fn().mockResolvedValue(new Response('not a map', { headers })),
      readDataUrl: jest.fn(),
    });
    loader.request('tile-1', TILE);
    await flush();
    expect(deliver).toHaveBeenCalledWith(
      expect.objectContaining({ reason: expect.stringMatching(/format|size/) }),
    );
    loader.dispose();
  });
  it('limits concurrent work, cancels unloaded tiles, and sends nothing after unmount', async () => {
    const signals: AbortSignal[] = [];
    const fetcher = jest.fn(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          signals.push(init.signal);
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const deliver = jest.fn();
    const loader = createNativeTileLoader(DEFAULT_TILE_URL, deliver, {
      fetch: fetcher,
      readDataUrl: jest.fn(),
    });
    for (let i = 0; i < 8; i++) loader.request(`t-${i}`, TILE);
    expect(fetcher).toHaveBeenCalledTimes(4);
    loader.cancel('t-4');
    loader.cancel('t-0');
    await flush();
    expect(signals[0].aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(5);
    loader.dispose();
    await flush();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(deliver).not.toHaveBeenCalled();
  });
  it('times out a stalled native request', async () => {
    jest.useFakeTimers();
    const deliver = jest.fn();
    const fetcher = jest.fn(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const loader = createNativeTileLoader(DEFAULT_TILE_URL, deliver, {
      fetch: fetcher,
      readDataUrl: jest.fn(),
    });
    loader.request('tile-1', TILE);
    await jest.advanceTimersByTimeAsync(12_000);
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ reason: 'timeout' }));
    loader.dispose();
  });
});

/** Execute the app's inline control script; Leaflet/DOM are stubbed, not an iOS browser. */
function mapHarness(native = true) {
  const messages: Record<string, unknown>[] = [];
  const events: Record<string, (event: { tile: Record<string, unknown> }) => void> = {};
  const tiles: Record<string, unknown> = {
    getTileUrl: () => TILE,
    on: (names: string, callback: (event: { tile: Record<string, unknown> }) => void) => {
      names.split(' ').forEach((name) => {
        events[name] = callback;
      });
    },
    addTo: () => tiles,
  };
  const send = (raw: string) => messages.push(JSON.parse(raw));
  const context = createContext({
    setTimeout,
    clearTimeout,
    Date,
    Error,
    window: { ReactNativeWebView: native ? { postMessage: send } : undefined, addEventListener: jest.fn() },
    parent: { postMessage: send },
    document: {
      createElement: () => ({ setAttribute: jest.fn(), appendChild: jest.fn() }),
      getElementById: () => ({}),
      createTextNode: (text: string) => text,
    },
    ResizeObserver: class {
      observe() {}
    },
  });
  const L = {
    map: () => ({
      attributionControl: { setPrefix: jest.fn(), getContainer: () => ({ appendChild: jest.fn() }) },
      on: jest.fn(),
    }),
    control: { zoom: () => ({ addTo: jest.fn() }) },
    tileLayer: () => tiles,
    layerGroup: () => ({ addTo: jest.fn() }),
  };
  context.L = L;
  context.window.L = L;
  const scripts = [
    ...mapDocument(DEFAULT_TILE_URL, '', false).matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g),
  ];
  new Script(scripts[0][1]).runInContext(context);
  new Script(scripts[2][1]).runInContext(context);
  return {
    messages,
    events,
    createTile: (done: jest.Mock) =>
      (
        tiles.createTile as (
          coords: object,
          callback: jest.Mock,
        ) => { src: string; onload: () => void; onerror: () => void; _mokiId: string }
      )({}, done),
    respond: (message: unknown) => context.window.MokiMap(message),
  };
}

describe('Inline map tile lifecycle', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  it('keeps the normal image path when WebView loads a tile', () => {
    const map = mapHarness();
    const done = jest.fn();
    const tile = map.createTile(done);
    expect(tile.src).toBe(TILE);
    tile.onload();
    expect(done).toHaveBeenCalledWith(null, tile);
    expect(map.messages.some((message) => message.type === 'nativeTileRequest')).toBe(false);
  });
  it('requests one native fallback, receives its image, and completes the Leaflet tile', () => {
    const map = mapHarness();
    const done = jest.fn();
    const tile = map.createTile(done);
    tile.onerror();
    expect(map.messages).toContainEqual({
      source: 'moki-map',
      type: 'nativeTileRequest',
      id: tile._mokiId,
      url: TILE,
    });
    map.respond({ type: 'nativeTile', id: tile._mokiId, data: DATA });
    expect(tile.src).toBe(DATA);
    tile.onload();
    expect(done).toHaveBeenCalledWith(null, tile);
    expect(map.messages.at(-1)).toMatchObject({ type: 'tileStatus', loaded: 1, failed: 0 });
  });
  it('reports an HTTP failure and does not hide it when another tile succeeds', () => {
    const map = mapHarness();
    const failed = map.createTile(jest.fn());
    failed.onerror();
    map.respond({ type: 'nativeTile', id: failed._mokiId, reason: 'http', status: 403 });
    const loaded = map.createTile(jest.fn());
    loaded.onload();
    expect(map.messages.at(-1)).toMatchObject({
      failed: 1,
      loaded: 1,
      reason: 'http',
      status: 403,
      url: TILE,
    });
    map.events.tileunload({ tile: failed });
    expect(map.messages.at(-1)).toMatchObject({ failed: 0, loaded: 1 });
  });
  it('cancels fallback work on zoom abort and ignores late responses', () => {
    const map = mapHarness();
    const done = jest.fn();
    const tile = map.createTile(done);
    jest.advanceTimersByTime(10_000);
    map.events.tileabort({ tile });
    map.respond({ type: 'nativeTile', id: tile._mokiId, data: DATA });
    expect(map.messages).toContainEqual({ source: 'moki-map', type: 'nativeTileCancel', id: tile._mokiId });
    expect(done).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
  it('reports a web failure without waiting for a nonexistent native bridge', () => {
    const map = mapHarness(false);
    const tile = map.createTile(jest.fn());
    tile.onerror();
    expect(map.messages.at(-1)).toMatchObject({ failed: 1, reason: 'network' });
    expect(map.messages.some((message) => message.type === 'nativeTileRequest')).toBe(false);
  });
});

describe('Map information panel drag snapping', () => {
  it('constrains height to the available panel area', () => {
    expect(clampSheetHeight(-100, 300)).toBe(0);
    expect(clampSheetHeight(500, 300)).toBe(300);
    expect(clampSheetHeight(180, 300)).toBe(180);
    expect(clampSheetHeight(180, -1)).toBe(0);
  });
  it('snaps to the nearer state for slow drags and follows a deliberate swipe', () => {
    expect(shouldExpandSheet(100, 300, 0.1)).toBe(false);
    expect(shouldExpandSheet(200, 300, 0.1)).toBe(true);
    expect(shouldExpandSheet(200, 300, 0.8)).toBe(false);
    expect(shouldExpandSheet(100, 300, -0.8)).toBe(true);
    expect(shouldExpandSheet(0, 0, -0.8)).toBe(false);
  });
});
