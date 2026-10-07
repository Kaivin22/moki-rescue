import * as Location from 'expo-location';
import { useCurrentLocation } from '../src/features/location/hooks/useCurrentLocation';

// Small hook harness: exercise asynchronous selection ordering without a native GPS.
const mockSlots: unknown[] = [];
let mockCursor = 0;
jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const index = mockCursor++;
    if (!(index in mockSlots)) mockSlots[index] = initial;
    return [
      mockSlots[index],
      (value: unknown) => {
        mockSlots[index] = value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = mockCursor++;
    if (!(index in mockSlots)) mockSlots[index] = { current: initial };
    return mockSlots[index];
  },
  useCallback: (callback: unknown) => callback,
  useEffect: () => undefined,
}));
jest.mock('expo-location', () => ({
  reverseGeocodeAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  PermissionStatus: { GRANTED: 'granted' },
  Accuracy: { High: 4 },
}));

function render() {
  mockCursor = 0;
  // Hooks above are replaced with the deterministic state/ref harness in this test.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useCurrentLocation();
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const first = { latitude: 16.05, longitude: 108.2, accuracy: null };
const second = { latitude: 16.07, longitude: 108.22, accuracy: null };
beforeEach(() => {
  mockSlots.length = 0;
  jest.resetAllMocks();
});

it('an older geocoder response cannot replace the latest pin label', async () => {
  const old = deferred<Location.LocationGeocodedAddress[]>();
  jest
    .mocked(Location.reverseGeocodeAsync)
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce([{ street: 'New pin' } as Location.LocationGeocodedAddress]);
  const selection = render();
  const pending = selection.selectCoordinate(first);
  await selection.selectCoordinate(second);
  old.resolve([{ street: 'Old pin' } as Location.LocationGeocodedAddress]);
  await pending;
  expect(render().coordinate).toMatchObject(second);
  expect(render().label).toBe('New pin');
});

it.each([false, true])(
  'preserves a manually typed label when reverse lookup settles, rejection=%s',
  async (failure) => {
    const lookup = deferred<Location.LocationGeocodedAddress[]>();
    jest.mocked(Location.reverseGeocodeAsync).mockReturnValue(lookup.promise);
    const selection = render();
    const pending = selection.selectCoordinate(first);
    selection.setLabel('Customer entrance');
    if (failure) lookup.reject(new Error('Offline'));
    else lookup.resolve([{ street: 'Lookup label' } as Location.LocationGeocodedAddress]);
    await pending;
    expect(render().label).toBe('Customer entrance');
  },
);

it('a late GPS fix cannot move a pin selected manually while GPS was pending', async () => {
  const gps = deferred<Location.LocationObject>();
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ status: 'granted' } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockReturnValue(gps.promise);
  jest.mocked(Location.reverseGeocodeAsync).mockResolvedValue([]);
  const selection = render();
  const pending = selection.requestLocation();
  await Promise.resolve();
  await selection.selectCoordinate(second);
  gps.resolve({ coords: { ...first, accuracy: 10 } } as Location.LocationObject);
  await pending;
  expect(render().coordinate).toMatchObject({ ...second, source: 'manual' });
});
