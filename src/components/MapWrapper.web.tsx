import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import { Colors } from '@/src/constants/colors';

export const MapView = forwardRef((props: any, ref: any) => (
  <View ref={ref} style={[{ justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, flex: 1 }, props.style]}>
    <Text style={{ color: Colors.textSecondary }}>Bản đồ không hỗ trợ trên Web</Text>
  </View>
));
MapView.displayName = 'MapView';

export const Marker = (props: any) => null;
export const Polyline = (props: any) => null;
export const PROVIDER_GOOGLE = null;
