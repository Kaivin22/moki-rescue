import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';
import type { MapSurfaceHandle, MapSurfaceProps } from './types';
import { MAP_DOCUMENT_BASE_URL, scriptJson } from './mapDocument';
import { createNativeTileLoader, MAP_USER_AGENT } from './nativeTileLoader';

export const MapSurface = forwardRef<MapSurfaceHandle, MapSurfaceProps>(
  ({ html, tileUrl, onMessage, onError }, ref) => {
    const web = useRef<WebView>(null);
    const tiles = useRef<ReturnType<typeof createNativeTileLoader> | null>(null);
    useEffect(() => {
      const loader = createNativeTileLoader(tileUrl, (result) => {
        web.current?.injectJavaScript(`window.MokiMap && window.MokiMap(${scriptJson(result)});true;`);
      });
      tiles.current = loader;
      return () => {
        loader.dispose();
        tiles.current = null;
      };
    }, [html, tileUrl]);
    useImperativeHandle(
      ref,
      () => ({
        send: (message) =>
          web.current?.injectJavaScript(`window.MokiMap && window.MokiMap(${scriptJson(message)});true;`),
      }),
      [],
    );
    return (
      <WebView
        ref={web}
        style={{ flex: 1 }}
        source={{ html, baseUrl: MAP_DOCUMENT_BASE_URL }}
        originWhitelist={['*']}
        applicationNameForUserAgent={MAP_USER_AGENT}
        javaScriptEnabled
        domStorageEnabled={false}
        cacheEnabled
        mixedContentMode="never"
        allowFileAccess={false}
        geolocationEnabled={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) =>
          request.url === 'about:blank' ||
          request.url.startsWith('about:blank#') ||
          request.url === MAP_DOCUMENT_BASE_URL
        }
        onMessage={(event) => {
          const raw = event.nativeEvent.data;
          try {
            const message = JSON.parse(raw);
            if (message.source === 'moki-map' && typeof message.id === 'string') {
              if (message.type === 'nativeTileRequest' && typeof message.url === 'string') {
                tiles.current?.request(message.id, message.url);
                return;
              }
              if (message.type === 'nativeTileCancel') {
                tiles.current?.cancel(message.id);
                return;
              }
            }
          } catch {
            /* The shared map component also ignores malformed messages. */
          }
          onMessage(raw);
        }}
        onError={onError}
        onContentProcessDidTerminate={onError}
        // iOS only reports main-frame HTTP errors here, not raster tile failures.
        // Tile failures are reported separately by Leaflet through onMessage.
        onHttpError={onError}
      />
    );
  },
);
MapSurface.displayName = 'MapSurface';
