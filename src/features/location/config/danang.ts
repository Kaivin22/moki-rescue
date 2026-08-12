/** Geographic defaults for this Da Nang-scoped product, not live device data. */
export const DA_NANG_CENTER = { latitude: 16.0544, longitude: 108.2022 } as const;
export const DA_NANG_INITIAL_REGION = {
  ...DA_NANG_CENTER,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
} as const;
