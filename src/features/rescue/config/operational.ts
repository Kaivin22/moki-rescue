export const RescueTiming = {
  apiTimeoutMs: 15_000,
  serviceCatalogStaleMs: 10 * 60_000,
  activeRequestRefetchMs: 15_000,
  requestDetailsRefetchMs: 10_000,
  providerOffersRefetchMs: 10_000,
  roadRouteRefetchMs: 30_000,
  availabilityLocationIntervalMs: 30_000,
  activeLocationIntervalMs: 10_000,
  backgroundLocationIntervalMs: 15_000,
  realtimeSendTimeoutMs: 5_000,
} as const;

export const RescueDistance = {
  availabilityLocationMeters: 50,
  activeLocationMeters: 20,
  backgroundLocationMeters: 25,
} as const;
