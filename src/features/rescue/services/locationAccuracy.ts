import type { LocationPoint } from '@/src/types/rescue';

export function isValidProviderAccuracy(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000;
}

export function isValidProviderLocation(value: unknown): value is LocationPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<LocationPoint>;
  return (
    typeof point.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude) &&
    point.longitude >= -180 &&
    point.longitude <= 180 &&
    isValidProviderAccuracy(point.accuracyM) &&
    typeof point.recordedAt === 'string'
  );
}
