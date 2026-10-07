import { Colors } from '@/src/constants/colors';
import leaflet from './vendor/leaflet-1.9.4.json';

export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
export const DEFAULT_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
// A real project URL identifies the inline document; it is not fetched as a page.
export const MAP_DOCUMENT_BASE_URL = 'https://github.com/Kaivin22/moki-rescue/';

// Safe inside an inline script even when names/notes contain HTML or script closers.
export function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function validCoordinate(value: unknown): value is { latitude: number; longitude: number } {
  if (!value || typeof value !== 'object') return false;
  const point = value as { latitude?: unknown; longitude?: unknown };
  return (
    typeof point.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    Math.abs(point.latitude) <= 90 &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.longitude) <= 180
  );
}

export function validTileUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      /^[a-z0-9.-]+$/i.test(url.hostname) &&
      ['{z}', '{x}', '{y}'].every((token) => value.includes(token))
    );
  } catch {
    return false;
  }
}

export function mapDocument(tileUrl: string, attribution: string, english: boolean): string {
  if (!validTileUrl(tileUrl)) throw new Error('Invalid HTTPS map tile URL');
  const tileOrigin = new URL(tileUrl).origin;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: ${tileOrigin}; connect-src 'none';">
<style>${leaflet.css}</style>
<style>html,body,#map{width:100%;height:100%;margin:0;background:${Colors.background};font-family:sans-serif}
.pin{width:22px;height:22px;border:3px solid ${Colors.white};border-radius:50%;box-shadow:0 1px 5px ${Colors.overlay};box-sizing:border-box}
.leaflet-control-attribution{font-size:11px;max-width:85vw}.leaflet-popup-content{white-space:pre-line}</style>
</head><body><div id="map" role="application" aria-label="OpenStreetMap"></div>
<script>
function send(payload){var message=JSON.stringify(Object.assign({source:'moki-map'},payload));
if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(message);}else{parent.postMessage(message,'*');}}
function fail(reason){send({type:'error',reason:reason||'runtime'});}
window.addEventListener('error',function(){fail('runtime');});
</script>
<script>${leaflet.js.replace(/<\/script/gi, '<\\/script')}</script>
<script>
if(window.L){
var map=L.map('map',{zoomControl:false,attributionControl:true});
L.control.zoom({position:'topright',zoomInTitle:${scriptJson(english ? 'Zoom in' : 'Phóng to')},zoomOutTitle:${scriptJson(english ? 'Zoom out' : 'Thu nhỏ')}}).addTo(map);
var attribution=document.createElement('span');attribution.textContent=${scriptJson(attribution)};
var osmLink=document.createElement('a');osmLink.href=${scriptJson(OSM_COPYRIGHT_URL)};osmLink.textContent='© OpenStreetMap contributors';
osmLink.onclick=function(e){e.preventDefault();send({type:'attribution'});};
map.attributionControl.setPrefix(false);map.attributionControl.getContainer().appendChild(osmLink);
if(attribution.textContent){map.attributionControl.getContainer().appendChild(document.createTextNode(' · '));map.attributionControl.getContainer().appendChild(attribution);}
var tiles=L.tileLayer(${scriptJson(tileUrl)},{maxZoom:19,updateWhenIdle:true,keepBuffer:1}).addTo(map);
tiles.on('tileerror',function(event){send({type:'tileError',url:event.tile.src});});tiles.on('tileload',function(){send({type:'tileLoaded'});});
var layers=L.layerGroup().addTo(map),lastRegion='',lastLayers='',padding={top:0,right:0,bottom:0,left:0};
function point(p){return [p.latitude,p.longitude];}
function fit(points,pad){if(!points.length)return;map.fitBounds(L.latLngBounds(points.map(point)),{animate:false,maxZoom:17,paddingTopLeft:[pad.left+12,pad.top+12],paddingBottomRight:[pad.right+12,pad.bottom+30]});}
window.MokiMap=function(raw){var message=typeof raw==='string'?JSON.parse(raw):raw;
if(message.type==='fit'){fit(message.coordinates,message.padding||padding);return;}
if(message.type!=='update')return;
padding=message.padding||{top:0,right:0,bottom:0,left:0};
map.getContainer().querySelector('.leaflet-top.leaflet-right').style.top=padding.top+'px';
map.getContainer().querySelector('.leaflet-bottom.leaflet-right').style.bottom=padding.bottom+'px';
var region=message.region;if(region&&JSON.stringify(region)!==lastRegion){lastRegion=JSON.stringify(region);
fit([{latitude:region.latitude-region.latitudeDelta/2,longitude:region.longitude-region.longitudeDelta/2},{latitude:region.latitude+region.latitudeDelta/2,longitude:region.longitude+region.longitudeDelta/2}],padding);}
var layerKey=JSON.stringify([message.markers,message.lines]);if(layerKey===lastLayers)return;lastLayers=layerKey;layers.clearLayers();
(message.markers||[]).forEach(function(marker,index){var pin=document.createElement('div');pin.className='pin';pin.style.backgroundColor=marker.pinColor||${scriptJson(Colors.primary)};
var m=L.marker(point(marker.coordinate),{draggable:!!marker.draggable,title:marker.title||'',icon:L.divIcon({className:'',html:pin,iconSize:[22,22],iconAnchor:[11,11]})}).addTo(layers);
if(marker.title||marker.description){var content=document.createElement('div');content.textContent=[marker.title,marker.description].filter(Boolean).join('\\n');m.bindPopup(content);}
m.on('dragend',function(){var p=m.getLatLng();send({type:'drag',index:index,coordinate:{latitude:p.lat,longitude:p.lng}});});});
(message.lines||[]).forEach(function(line){if(line.coordinates.length>=2)L.polyline(line.coordinates.map(point),{color:line.strokeColor||${scriptJson(Colors.primary)},weight:line.strokeWidth||5}).addTo(layers);});};
window.addEventListener('message',function(event){if(event.source!==parent)return;try{window.MokiMap(event.data);}catch(e){fail();}});
map.on('click',function(event){send({type:'press',coordinate:{latitude:event.latlng.lat,longitude:event.latlng.lng}});});
new ResizeObserver(function(){map.invalidateSize();}).observe(document.getElementById('map'));
send({type:'ready'});
}else{fail('library');}
</script></body></html>`;
}
