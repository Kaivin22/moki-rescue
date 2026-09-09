import Constants from 'expo-constants';
import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
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
  const [failed, setFailed] = useState(false);
  const [tileFailed, setTileFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const markers: MapMarkerProps[] = [];
  const lines: MapPolylineProps[] = [];
  Children.forEach(props.children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Marker) markers.push(child.props as MapMarkerProps);
    if (child.type === Polyline) lines.push(child.props as MapPolylineProps);
  });
  const current = useRef({ props, markers });
  current.current = { props, markers };
  const html = useMemo(
    () =>
      mapDocument(
        String(Constants.expoConfig?.extra?.mapTileUrl || DEFAULT_TILE_URL),
        String(Constants.expoConfig?.extra?.mapTileAttribution || ''),
        english,
      ),
    [english],
  );
  const update = JSON.stringify({
    type: 'update',
    region: props.region ?? props.initialRegion,
    padding: props.mapPadding,
    markers,
    lines,
  });
  const latestUpdate = useRef(update);
  latestUpdate.current = update;
  const onError = useCallback(() => setFailed(true), []);
  const onMessage = useCallback((raw: string) => {
    try {
      const message = JSON.parse(raw);
      if (message.source !== 'moki-map') return;
      if (message.type === 'ready') {
        if (timeout.current) clearTimeout(timeout.current);
        setReady(true);
        setFailed(false);
        surface.current?.send(latestUpdate.current);
        current.current.props.onMapReady?.();
      } else if (message.type === 'error') setFailed(true);
      else if (message.type === 'tileError') setTileFailed(true);
      else if (message.type === 'tileLoaded') setTileFailed(false);
      else if (message.type === 'attribution') void Linking.openURL(OSM_COPYRIGHT_URL).catch(() => undefined);
      else if (validCoordinate(message.coordinate)) {
        const event = { nativeEvent: { coordinate: message.coordinate } };
        if (message.type === 'press') current.current.props.onPress?.(event);
        if (message.type === 'drag' && Number.isInteger(message.index))
          current.current.markers[message.index]?.onDragEnd?.(event);
      }
    } catch {
      /* Ignore malformed messages from the isolated map document. */
    }
  }, []);
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
    setReady(false);
    setFailed(false);
    timeout.current = setTimeout(() => setFailed(true), 20_000);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [html, attempt]);
  return (
    <View style={[{ overflow: 'hidden' }, props.style]}>
      <MapSurface key={attempt} ref={surface} html={html} onMessage={onMessage} onError={onError} />
      {(!ready || failed || tileFailed) && (
        <View style={[styles.notice, { top: (props.mapPadding?.top ?? 0) + 8 }]}>
          <Text style={styles.text}>
            {failed || tileFailed
              ? english
                ? 'Map unavailable. Check your connection.'
                : 'Chưa tải được bản đồ. Kiểm tra kết nối mạng.'
              : english
                ? 'Loading map…'
                : 'Đang tải bản đồ…'}
          </Text>
          {(failed || tileFailed) && (
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
