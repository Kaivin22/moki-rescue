export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  coordinates: Coordinate[];
  distance: number; // in meters
  duration: number; // in seconds
  source: 'road';
  transport: RoadTransport;
}

export interface RouteMatrix {
  durations: number[][]; // seconds, [from][to]
  distances: number[][]; // meters,  [from][to]
}

export type RoadTransport = 'motorbike' | 'car' | 'walk' | 'bicycle';
export type RouteFailureReason = 'not_configured' | 'invalid_coordinates' | 'timeout' | 'no_route' | 'service_error' | 'invalid_response';
export type RouteFetchResult =
  | { ok: true; route: RouteInfo }
  | { ok: false; reason: RouteFailureReason; message: string };

export function buildGoogleMapsDirectionsUrl(waypoints: Coordinate[], transport: RoadTransport): string | null {
  if (waypoints.length < 2 || !waypoints.every(validCoordinate)) return null;
  const origin = `${waypoints[0].latitude},${waypoints[0].longitude}`;
  const destination = `${waypoints[waypoints.length - 1].latitude},${waypoints[waypoints.length - 1].longitude}`;
  const intermediate = waypoints.slice(1, -1).map(({ latitude, longitude }) => `${latitude},${longitude}`).join('|');
  const travelMode = transport === 'walk'
    ? 'walking'
    : transport === 'bicycle'
      ? 'bicycling'
      : transport === 'motorbike' ? 'two-wheeler' : 'driving';
  return [
    'https://www.google.com/maps/dir/?api=1',
    `origin=${encodeURIComponent(origin)}`,
    `destination=${encodeURIComponent(destination)}`,
    `travelmode=${travelMode}`,
    intermediate ? `waypoints=${encodeURIComponent(intermediate)}` : '',
  ].filter(Boolean).join('&');
}

const ROUTING_TIMEOUT_MS = 12_000;
const MAX_SNAP_RADIUS_METERS = 750;

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function routingBaseUrl(transport: RoadTransport): string {
  const legacyCarUrl = process.env.EXPO_PUBLIC_OSRM_BASE_URL || '';
  const value = transport === 'car'
    ? process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL || legacyCarUrl
    : transport === 'motorbike'
      ? process.env.EXPO_PUBLIC_OSRM_MOTORBIKE_BASE_URL || ''
      : transport === 'walk'
        ? process.env.EXPO_PUBLIC_OSRM_WALK_BASE_URL || ''
        : process.env.EXPO_PUBLIC_OSRM_BICYCLE_BASE_URL || '';
  return normalizeBaseUrl(value);
}

function validCoordinate({ latitude, longitude }: Coordinate): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * fetchOSRMMatrix — ma trận thời gian/khoảng cách giữa mọi cặp waypoint (OSRM /table).
 * Chỉ 1 request cho cả ngày. Lỗi/offline → trả null để optimizer fallback haversine.
 */
export async function fetchOSRMMatrix(waypoints: Coordinate[], transport: RoadTransport = 'car'): Promise<RouteMatrix | null> {
  const baseUrl = routingBaseUrl(transport);
  if (waypoints.length < 2 || !baseUrl || !waypoints.every(validCoordinate)) return null;

  try {
    const coordinatesString = waypoints
      .map((wp) => `${wp.longitude},${wp.latitude}`)
      .join(';');

    const radiuses = waypoints.map(() => MAX_SNAP_RADIUS_METERS).join(';');
    const url = `${baseUrl}/table/v1/driving/${coordinatesString}?annotations=duration,distance&radiuses=${radiuses}`;

    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`OSRM table API error: ${response.status}`);
    }

    const data = await response.json();
    const hasExpectedShape = (matrix: unknown) => Array.isArray(matrix)
      && matrix.length === waypoints.length
      && matrix.every((row) => Array.isArray(row)
        && row.length === waypoints.length
        && row.every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0));
    if (data.code === 'Ok' && hasExpectedShape(data.durations) && hasExpectedShape(data.distances)) {
      return {
        durations: data.durations,
        distances: data.distances,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching OSRM matrix:', error);
    return null;
  }
}

export async function fetchRoadRoute(waypoints: Coordinate[], transport: RoadTransport = 'car'): Promise<RouteFetchResult> {
  const baseUrl = routingBaseUrl(transport);
  if (!baseUrl) {
    return { ok: false, reason: 'not_configured', message: `Chưa cấu hình dịch vụ định tuyến cho ${transport}.` };
  }
  if (waypoints.length < 2 || !waypoints.every(validCoordinate)) {
    return { ok: false, reason: 'invalid_coordinates', message: 'Cần ít nhất hai địa điểm có tọa độ hợp lệ.' };
  }

  try {
    // OSRM requires coordinates in longitude,latitude format
    const coordinatesString = waypoints
      .map((wp) => `${wp.longitude},${wp.latitude}`)
      .join(';');

    const radiuses = waypoints.map(() => MAX_SNAP_RADIUS_METERS).join(';');
    const url = `${baseUrl}/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson&steps=false&radiuses=${radiuses}`;

    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      return { ok: false, reason: 'service_error', message: `Dịch vụ định tuyến phản hồi lỗi ${response.status}.` };
    }

    const data = await response.json();

    if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
      const route = data.routes[0];
      if (!Array.isArray(route?.geometry?.coordinates) || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) {
        return { ok: false, reason: 'invalid_response', message: 'Dữ liệu tuyến đường không hợp lệ.' };
      }
      const coords = route.geometry.coordinates.map((c: number[]) => ({
        latitude: c[1],
        longitude: c[0],
      })).filter(validCoordinate);
      if (coords.length < 2) {
        return { ok: false, reason: 'invalid_response', message: 'Dịch vụ không trả về hình học tuyến đường hợp lệ.' };
      }

      return { ok: true, route: {
        coordinates: coords,
        distance: route.distance,
        duration: route.duration,
        source: 'road',
        transport,
      } };
    }

    return { ok: false, reason: 'no_route', message: 'Không tìm thấy tuyến đường phù hợp giữa các địa điểm.' };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, reason: 'timeout', message: 'Dịch vụ định tuyến phản hồi quá lâu.' };
    }
    return { ok: false, reason: 'service_error', message: 'Không thể kết nối dịch vụ định tuyến.' };
  }
}
