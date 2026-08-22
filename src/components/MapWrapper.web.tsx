import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type NativeMapView from 'react-native-maps';
import type { MapMarkerProps, MapPolylineProps, MapViewProps } from 'react-native-maps';
import { Colors } from '@/src/constants/colors';
import { useI18n } from '@/src/i18n';

export const MapView = forwardRef<NativeMapView, MapViewProps>((props, _ref) => {
  const language = useI18n((state) => state.language);
  return (
    <View style={[styles.map, props.style]}>
      <Text style={styles.text}>
        {language === 'en'
          ? 'Interactive maps are only supported on iOS and Android.'
          : 'Bản đồ tương tác chỉ hỗ trợ trên iOS và Android.'}
      </Text>
    </View>
  );
});
MapView.displayName = 'MapView';

export const Marker = (_props: MapMarkerProps) => null;
export const Polyline = (_props: MapPolylineProps) => null;
export const PROVIDER_GOOGLE = null;

const styles = StyleSheet.create({
  map: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  text: { color: Colors.textSecondary, textAlign: 'center', padding: 24 },
});
