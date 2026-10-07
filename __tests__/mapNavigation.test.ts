import { Script } from 'node:vm';
import { createHash } from 'node:crypto';
import leaflet from '../src/features/maps/vendor/leaflet-1.9.4.json';
import {
  DEFAULT_TILE_URL,
  mapDocument,
  scriptJson,
  validCoordinate,
  validTileUrl,
} from '../src/features/maps/mapDocument';
import { googleMapsNavigationUrl, navigationDestination } from '../src/features/rescue/services/navigation';

describe('OpenStreetMap document', () => {
  it('bundles verified Leaflet assets without runtime CDN requests', () => {
    expect(createHash('sha256').update(leaflet.js).digest('base64')).toBe(
      '20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
    );
    expect(createHash('sha256').update(leaflet.css).digest('base64')).toBe(
      'p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
    );
    const html = mapDocument(DEFAULT_TILE_URL, '', false);
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+href=/);
  });
  it.each([false, true])('generates valid inline JavaScript, english=%s', (english) => {
    const html = mapDocument(DEFAULT_TILE_URL, '</script><script>alert(1)</script>', english);
    const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
    expect(scripts).toHaveLength(3);
    scripts.forEach((script) => expect(() => new Script(script[1])).not.toThrow());
    expect(html).toContain('https://www.openstreetmap.org/copyright');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('keepBuffer:1');
    expect(html).toContain('content.textContent=');
  });

  it('round-trips unsafe text without allowing inline script breakout', () => {
    const text = '</script>\u2028\u2029<svg onload=alert(1)>';
    const encoded = scriptJson(text);
    expect(encoded).not.toContain('<');
    expect(JSON.parse(encoded)).toBe(text);
  });

  it.each([
    'http://tiles.test/{z}/{x}/{y}.png',
    'javascript:alert(1)',
    'https://tiles.test/map.png',
    'https://user:pass@tiles.test/{z}/{x}/{y}.png',
    "https://tiles.test';img-src *;/{z}/{x}/{y}.png",
  ])('rejects unsafe tile configuration %s', (url) => {
    expect(validTileUrl(url)).toBe(false);
    expect(() => mapDocument(url, '', false)).toThrow();
  });
  it('accepts configurable HTTPS XYZ providers', () => {
    expect(validTileUrl(DEFAULT_TILE_URL)).toBe(true);
    expect(validTileUrl('https://tiles.example.com/{z}/{x}/{y}.png?key=public')).toBe(true);
  });
});

describe('External Google Maps navigation', () => {
  const request = {
    status: 'en_route' as const,
    activeWorkType: 'transport' as const,
    pickupLatitude: 16.05,
    pickupLongitude: 108.2,
    destinationLatitude: 16.07,
    destinationLongitude: 108.22,
  };

  it('navigates to the customer before transport begins', () => {
    expect(navigationDestination(request)).toEqual({ latitude: 16.05, longitude: 108.2 });
  });
  it.each(['transporting', 'awaiting_completion'] as const)('navigates to dropoff during %s', (status) => {
    expect(navigationDestination({ ...request, status })).toEqual({ latitude: 16.07, longitude: 108.22 });
  });
  it('does not fall back to the wrong destination when transport has no dropoff', () => {
    expect(() =>
      navigationDestination({ ...request, status: 'transporting', destinationLatitude: null }),
    ).toThrow();
  });
  it('uses current device location, motorcycle navigation, and no API key', () => {
    const url = new URL(googleMapsNavigationUrl(navigationDestination(request)));
    expect(url.origin).toBe('https://www.google.com');
    expect(url.searchParams.get('destination')).toBe('16.050000,108.200000');
    expect(url.searchParams.get('travelmode')).toBe('two-wheeler');
    expect(url.searchParams.get('dir_action')).toBe('navigate');
    expect(url.searchParams.has('origin')).toBe(false);
    expect(url.searchParams.has('key')).toBe(false);
  });
  it.each([
    { latitude: NaN, longitude: 108 },
    { latitude: 91, longitude: 108 },
    { latitude: 16, longitude: Infinity },
    { latitude: 16, longitude: -181 },
  ])('rejects invalid coordinates %j', (point) => {
    expect(validCoordinate(point)).toBe(false);
    expect(() => googleMapsNavigationUrl(point)).toThrow();
  });
});
