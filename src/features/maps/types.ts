import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}
export interface MapRegion extends MapCoordinate {
  latitudeDelta: number;
  longitudeDelta: number;
}
export interface MapPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export interface MapEvent {
  nativeEvent: { coordinate: MapCoordinate };
}
export interface MapMarkerProps {
  coordinate: MapCoordinate;
  title?: string;
  description?: string;
  pinColor?: string;
  draggable?: boolean;
  onDragEnd?: (event: MapEvent) => void;
}
export interface MapPolylineProps {
  coordinates: MapCoordinate[];
  strokeColor?: string;
  strokeWidth?: number;
}
export interface MapViewHandle {
  fitToCoordinates: (
    coordinates: MapCoordinate[],
    options?: { animated?: boolean; edgePadding?: MapPadding },
  ) => void;
}
export interface MapViewProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  region?: MapRegion;
  initialRegion?: MapRegion;
  mapPadding?: MapPadding;
  onPress?: (event: MapEvent) => void;
  onMapReady?: () => void;
  toolbarEnabled?: boolean;
  showsMyLocationButton?: boolean;
  loadingEnabled?: boolean;
}
export interface MapSurfaceHandle {
  send: (message: string) => void;
}
export interface MapSurfaceProps {
  html: string;
  tileUrl: string;
  onMessage: (message: string) => void;
  onError: () => void;
}
