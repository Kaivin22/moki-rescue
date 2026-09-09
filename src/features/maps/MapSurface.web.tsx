import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { MapSurfaceHandle, MapSurfaceProps } from './types';

export const MapSurface = forwardRef<MapSurfaceHandle, MapSurfaceProps>(
  ({ html, onMessage, onError }, ref) => {
    const frame = useRef<HTMLIFrameElement>(null);
    useImperativeHandle(
      ref,
      () => ({ send: (message) => frame.current?.contentWindow?.postMessage(message, '*') }),
      [],
    );
    useEffect(() => {
      const listener = (event: MessageEvent) => {
        if (event.source === frame.current?.contentWindow && typeof event.data === 'string')
          onMessage(event.data);
      };
      window.addEventListener('message', listener);
      return () => window.removeEventListener('message', listener);
    }, [onMessage]);
    return (
      <iframe
        ref={frame}
        title="OpenStreetMap"
        srcDoc={html}
        sandbox="allow-scripts"
        referrerPolicy="strict-origin-when-cross-origin"
        onError={onError}
        style={{ width: '100%', height: '100%', border: 0, flex: 1 }}
      />
    );
  },
);
MapSurface.displayName = 'MapSurface';
