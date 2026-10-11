// Fallback for raster requests that fail in the inline mobile WebView. No proxy,
// credentials, disk downloads, provider switching, or cache-busting requests.
export const MAP_USER_AGENT = 'MokiRescue/1.0 (+https://github.com/Kaivin22/moki-rescue)';
const MAX_TILE_BYTES = 512 * 1024;
const MAX_PENDING = 32;
const CONCURRENCY = 4;

export type TileResult = {
  type: 'nativeTile';
  id: string;
  data?: string;
  reason?: string;
  status?: number;
};

/** The WebView bridge must not become an arbitrary native HTTP client. */
export function matchesTileTemplate(url: string, template: string): boolean {
  if (url.length > 2048) return false;
  const tokens: string[] = [];
  const pattern = template
    .split(/(\{[zxy]\})/)
    .map((part) => {
      if (/^\{[zxy]\}$/.test(part)) {
        tokens.push(part[1]);
        return '(\\d{1,7})';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  const match = new RegExp(`^${pattern}$`).exec(url);
  if (!match || !url.startsWith('https://')) return false;
  const coordinates = Object.fromEntries(tokens.map((token, i) => [token, Number(match[i + 1])]));
  return (
    coordinates.z >= 0 &&
    coordinates.z <= 19 &&
    coordinates.x >= 0 &&
    coordinates.x < 2 ** coordinates.z &&
    coordinates.y >= 0 &&
    coordinates.y < 2 ** coordinates.z
  );
}

function readDataUrl(blob: Blob, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => {
      reader.abort();
      reject(new Error('aborted'));
    };
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('decode'));
    reader.onloadend = () => signal.removeEventListener('abort', abort);
    reader.readAsDataURL(blob);
  });
}

export function createNativeTileLoader(
  template: string,
  deliver: (result: TileResult) => void,
  dependencies = { fetch: globalThis.fetch, readDataUrl },
) {
  type Job = { id: string; url: string; controller: AbortController };
  const pending = new Map<string, Job>();
  const queue: Job[] = [];
  let running = 0;
  let disposed = false;

  const run = async (job: Job) => {
    running++;
    let timedOut = false;
    let status: number | undefined;
    const timeout = setTimeout(() => {
      timedOut = true;
      job.controller.abort();
    }, 12_000);
    let result: TileResult;
    try {
      const response = await dependencies.fetch(job.url, {
        signal: job.controller.signal,
        headers: { 'User-Agent': MAP_USER_AGENT, Accept: 'image/png,image/jpeg,image/webp' },
        credentials: 'omit',
      });
      status = response.status;
      if (!response.ok) throw new Error('http');
      if (!/^image\/(png|jpeg|webp)(;|$)/i.test(response.headers.get('content-type') || '')) {
        throw new Error('format');
      }
      if (Number(response.headers.get('content-length')) > MAX_TILE_BYTES) throw new Error('size');
      const blob = await response.blob();
      try {
        if (!blob.size || blob.size > MAX_TILE_BYTES) throw new Error('size');
        const data = await dependencies.readDataUrl(blob, job.controller.signal);
        if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data)) throw new Error('format');
        result = { type: 'nativeTile', id: job.id, data };
      } finally {
        // RN Blob owns native memory; release it once the WebView data URI is ready.
        (blob as Blob & { close?: () => void }).close?.();
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      result = {
        type: 'nativeTile',
        id: job.id,
        status,
        reason: timedOut ? 'timeout' : ['http', 'format', 'size'].includes(code) ? code : 'network',
      };
    } finally {
      clearTimeout(timeout);
    }
    if (!disposed && pending.get(job.id) === job) {
      pending.delete(job.id);
      deliver(result);
    }
    running--;
    pump();
  };
  const pump = () => {
    while (!disposed && running < CONCURRENCY && queue.length) {
      const job = queue.shift()!;
      if (pending.get(job.id) === job) void run(job);
    }
  };
  return {
    request(id: string, url: string) {
      if (disposed || !/^[a-zA-Z0-9-]{1,64}$/.test(id) || pending.has(id)) return;
      if (!matchesTileTemplate(url, template)) {
        deliver({ type: 'nativeTile', id, reason: 'config' });
        return;
      }
      if (pending.size >= MAX_PENDING) {
        deliver({ type: 'nativeTile', id, reason: 'busy' });
        return;
      }
      const job = { id, url, controller: new AbortController() };
      pending.set(id, job);
      queue.push(job);
      pump();
    },
    cancel(id: string) {
      pending.get(id)?.controller.abort();
      pending.delete(id);
      const index = queue.findIndex((job) => job.id === id);
      if (index >= 0) queue.splice(index, 1);
    },
    dispose() {
      disposed = true;
      pending.forEach((job) => job.controller.abort());
      pending.clear();
      queue.length = 0;
    },
  };
}
