import { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';
import type { MapSurfaceHandle, MapSurfaceProps } from './types';
import { MAP_DOCUMENT_BASE_URL, scriptJson } from './mapDocument';

export const MapSurface = forwardRef<MapSurfaceHandle, MapSurfaceProps>(
  ({ html, onMessage, onError }, ref) => {
    const web = useRef<WebView>(null);
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
        applicationNameForUserAgent="MokiRescue/1.0 (+https://github.com/Kaivin22/moki-rescue)"
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
        onMessage={(event) => onMessage(event.nativeEvent.data)}
        onError={onError}
        // iOS only reports main-frame HTTP errors here, not raster tile failures.
        // Tile failures are reported separately by Leaflet through onMessage.
        onHttpError={onError}
      />
    );
  },
);
MapSurface.displayName = 'MapSurface';
