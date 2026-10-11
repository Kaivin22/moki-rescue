Leaflet 1.9.4 is bundled here so map initialization does not depend on a CDN.
OSM raster tiles are still fetched online; this is not an offline tile download.

Source: https://unpkg.com/leaflet@1.9.4/dist/leaflet.js and leaflet.css.
License: BSD-2-Clause, reproduced in LICENSE.leaflet.

SHA-256 (base64), verified before importing:

- JS: 20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=
- CSS: p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=

The JSON strings preserve the upstream files unchanged. mapDocument escapes script
closers before embedding JavaScript. Default marker images/layers controls are not
used: the application uses divIcon markers and a single raster layer.
