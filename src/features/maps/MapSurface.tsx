import { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';
import type { MapSurfaceHandle, MapSurfaceProps } from './types';
import { scriptJson } from './mapDocument';

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
        source={{ html }}
        originWhitelist={['*']}
        userAgent="MokiRescue/1.0 (+https://github.com/Kaivin22/moki-rescue)"
        javaScriptEnabled
        domStorageEnabled={false}
        cacheEnabled
        mixedContentMode="never"
        allowFileAccess={false}
        geolocationEnabled={false}
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={(request) =>
          request.url === 'about:blank' || request.url.startsWith('about:blank#')
        }
        onMessage={(event) => onMessage(event.nativeEvent.data)}
        onError={onError}
        onHttpError={onError}
      />
    );
  },
);
MapSurface.displayName = 'MapSurface';
