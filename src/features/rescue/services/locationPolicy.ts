export const PROVIDER_LOCATION_MAX_OUTBOX_AGE_MS = 2 * 60_000;

export function isLocationFresh(recordedAt: string, now = Date.now()) {
  const timestamp = Date.parse(recordedAt);
  return (
    Number.isFinite(timestamp) &&
    now - timestamp >= 0 &&
    now - timestamp <= PROVIDER_LOCATION_MAX_OUTBOX_AGE_MS
  );
}
