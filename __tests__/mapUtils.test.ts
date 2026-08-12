import { buildGoogleMapsDirectionsUrl, fetchOSRMMatrix, fetchRoadRoute } from '../src/utils/mapUtils';

describe('mapUtils road routing', () => {
  const points = [
    { latitude: 16.05, longitude: 108.2 },
    { latitude: 16.1, longitude: 108.25 },
  ];
  const originalFetch = global.fetch;
  const originalCarUrl = process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL;
  const originalMotorbikeUrl = process.env.EXPO_PUBLIC_OSRM_MOTORBIKE_BASE_URL;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalCarUrl === undefined) delete process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL;
    else process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL = originalCarUrl;
    if (originalMotorbikeUrl === undefined) delete process.env.EXPO_PUBLIC_OSRM_MOTORBIKE_BASE_URL;
    else process.env.EXPO_PUBLIC_OSRM_MOTORBIKE_BASE_URL = originalMotorbikeUrl;
  });

  it('returns only road geometry supplied by the configured transport router', async () => {
    process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL = 'https://routing.test/';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'Ok',
        routes: [{
          distance: 7200,
          duration: 900,
          geometry: { coordinates: [[108.2, 16.05], [108.21, 16.07], [108.25, 16.1]] },
        }],
      }),
    } as Response);

    const result = await fetchRoadRoute(points, 'car');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.route.source).toBe('road');
      expect(result.route.coordinates).toEqual([
        { latitude: 16.05, longitude: 108.2 },
        { latitude: 16.07, longitude: 108.21 },
        { latitude: 16.1, longitude: 108.25 },
      ]);
    }
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/route/v1/driving/108.2,16.05;108.25,16.1?'),
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('radiuses=750;750');
  });

  it('does not call another transport profile when the selected one is not configured', async () => {
    process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL = 'https://car-routing.test';
    delete process.env.EXPO_PUBLIC_OSRM_MOTORBIKE_BASE_URL;
    global.fetch = jest.fn();

    const result = await fetchRoadRoute(points, 'motorbike');

    expect(result).toMatchObject({ ok: false, reason: 'not_configured' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects incomplete matrices instead of mixing road times with straight-line distances', async () => {
    process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL = 'https://routing.test';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 'Ok',
        durations: [[0, 600], [600, 0]],
        distances: [[0, null], [5000, 0]],
      }),
    } as Response);

    await expect(fetchOSRMMatrix(points, 'car')).resolves.toBeNull();
  });

  it('reports invalid route geometry and never manufactures a straight line', async () => {
    process.env.EXPO_PUBLIC_OSRM_CAR_BASE_URL = 'https://routing.test';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 'Ok', routes: [{ distance: 100, duration: 20, geometry: { coordinates: [] } }] }),
    } as Response);

    await expect(fetchRoadRoute(points, 'car')).resolves.toMatchObject({
      ok: false,
      reason: 'invalid_response',
    });
  });

  it.each([
    ['car', 'driving'],
    ['motorbike', 'two-wheeler'],
    ['walk', 'walking'],
    ['bicycle', 'bicycling'],
  ] as const)('opens Google Maps with the matching %s mode', (transport, expectedMode) => {
    const url = buildGoogleMapsDirectionsUrl(points, transport);
    expect(url).toContain(`travelmode=${expectedMode}`);
    expect(url).toContain('origin=16.05%2C108.2');
    expect(url).toContain('destination=16.1%2C108.25');
  });
});
