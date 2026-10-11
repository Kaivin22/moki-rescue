import Constants from 'expo-constants';
import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '@/src/i18n';
import { Colors } from '@/src/constants/colors';
import { MapSurface } from './MapSurface';
import { DEFAULT_TILE_URL, mapDocument, OSM_COPYRIGHT_URL, validCoordinate } from './mapDocument';
import type {
  MapMarkerProps,
  MapPolylineProps,
  MapSurfaceHandle,
  MapViewHandle,
  MapViewProps,
} from './types';

export const Marker = (_props: MapMarkerProps) => null;
export const Polyline = (_props: MapPolylineProps) => null;

export const MapView = forwardRef<MapViewHandle, MapViewProps>((props, ref) => {
  const english = useI18n((state) => state.language === 'en');
  const surface = useRef<MapSurfaceHandle>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [tileFailed, setTileFailed] = useState(false);
  const [tileLoading, setTileLoading] = useState(true);
  const [tileFailureReason, setTileFailureReason] = useState('');
  const [failedTileUrl, setFailedTileUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const markers: MapMarkerProps[] = [];
  const lines: MapPolylineProps[] = [];
  Children.forEach(props.children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Marker) markers.push(child.props as MapMarkerProps);
    if (child.type === Polyline) lines.push(child.props as MapPolylineProps);
  });
  const current = useRef({ props, markers });
  const tileUrl = String(Constants.expoConfig?.extra?.mapTileUrl || DEFAULT_TILE_URL);
  const html = useMemo(
    () => mapDocument(tileUrl, String(Constants.expoConfig?.extra?.mapTileAttribution || ''), english),
    [english, tileUrl],
  );
  const update = JSON.stringify({
    type: 'update',
    region: props.region ?? props.initialRegion,
    padding: props.mapPadding,
    markers,
    lines,
  });
  const latestUpdate = useRef(update);
  useLayoutEffect(() => {
    current.current = { props, markers };
    latestUpdate.current = update;
  });
  const [documentState, setDocumentState] = useState({ html, attempt });
  if (documentState.html !== html || documentState.attempt !== attempt) {
    setDocumentState({ html, attempt });
    setReady(false);
    setFailure(null);
    setTileFailed(false);
    setTileLoading(true);
    setTileFailureReason('');
    setFailedTileUrl(null);
  }
  const onError = useCallback(() => setFailure('webview'), []);
  const onMessage = useCallback(
    (raw: string) => {
      try {
        const message = JSON.parse(raw);
        if (message.source !== 'moki-map') return;
        if (message.type === 'ready') {
          if (timeout.current) clearTimeout(timeout.current);
          setReady(true);
          setFailure(null);
          surface.current?.send(latestUpdate.current);
          current.current.props.onMapReady?.();
        } else if (message.type === 'error') setFailure(message.reason === 'library' ? 'library' : 'runtime');
        else if (message.type === 'tileStatus') {
          setTileFailed(message.failed > 0);
          setTileLoading(Boolean(message.loading) && message.loaded === 0);
          const reason =
            typeof message.reason === 'string' && /^[a-z]{1,16}$/.test(message.reason) ? message.reason : '';
          setTileFailureReason(
            Number.isInteger(message.status) && message.status >= 400 && message.status < 600
              ? `HTTP ${message.status}`
              : reason,
          );
          if (typeof message.url === 'string') {
            const tile = new URL(message.url);
            const configured = new URL(tileUrl);
            if (tile.protocol === 'https:' && tile.origin === configured.origin) setFailedTileUrl(tile.href);
          } else setFailedTileUrl(null);
        } else if (message.type === 'attribution')
          void Linking.openURL(OSM_COPYRIGHT_URL).catch(() => undefined);
        else if (validCoordinate(message.coordinate)) {
          const event = { nativeEvent: { coordinate: message.coordinate } };
          if (message.type === 'press') current.current.props.onPress?.(event);
          if (message.type === 'drag' && Number.isInteger(message.index))
            current.current.markers[message.index]?.onDragEnd?.(event);
        }
      } catch {
        /* Ignore malformed messages from the isolated map document. */
      }
    },
    [tileUrl],
  );
  useImperativeHandle(
    ref,
    () => ({
      fitToCoordinates: (coordinates, options) => {
        surface.current?.send(
          JSON.stringify({
            type: 'fit',
            coordinates: coordinates.filter(validCoordinate),
            padding: options?.edgePadding,
          }),
        );
      },
    }),
    [],
  );
  useEffect(() => {
    if (ready) surface.current?.send(update);
  }, [ready, update]);
  useEffect(() => {
    if (ready || failure) return;
    timeout.current = setTimeout(() => setFailure('timeout'), 20_000);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [html, attempt, ready, failure]);
  return (
    <View style={[{ overflow: 'hidden' }, props.style]}>
      <MapSurface
        key={attempt}
        ref={surface}
        html={html}
        tileUrl={tileUrl}
        onMessage={onMessage}
        onError={onError}
      />
      {(!ready || failure || tileFailed || tileLoading) && (
        <View style={[styles.notice, { top: (props.mapPadding?.top ?? 0) + 8 }]}>
          <Text style={styles.text}>
            {failure
              ? english
                ? `Map could not start (${failure}). Tap Retry.`
                : `Không khởi tạo được bản đồ (${failure}). Hãy bấm Thử lại.`
              : tileFailed
                ? english
                  ? `Map images could not load (${tileFailureReason || 'network'}). Check the image source or try another network.`
                  : `Chưa tải được ảnh nền (${tileFailureReason || 'network'}). Kiểm tra nguồn ảnh hoặc thử mạng khác.`
                : english
                  ? 'Loading map…'
                  : 'Đang tải bản đồ…'}
          </Text>
          {tileFailed && failedTileUrl ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={
                english ? 'Check image source in browser' : 'Kiểm tra nguồn ảnh trên trình duyệt'
              }
              onPress={() => void Linking.openURL(failedTileUrl).catch(() => undefined)}
            >
              <Text style={styles.retry}>
                {english ? 'Check image source in browser' : 'Kiểm tra nguồn ảnh trên trình duyệt'}
              </Text>
            </Pressable>
          ) : null}
          {(failure || tileFailed) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={english ? 'Reload map' : 'Tải lại bản đồ'}
              onPress={() => {
                setTileFailed(false);
                setAttempt((n) => n + 1);
              }}
            >
              <Text style={styles.retry}>{english ? 'Retry' : 'Thử lại'}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
});
MapView.displayName = 'MapView';
const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    left: 12,
    right: 58,
    backgroundColor: Colors.overlayLight,
    padding: 10,
    borderRadius: 8,
  },
  text: { color: Colors.textSecondary, fontSize: 12 },
  retry: { color: Colors.primary, fontWeight: '600', paddingTop: 8 },
});
