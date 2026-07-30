import { Place } from '@/src/types/place';
import { WeatherDay, getBestVisitTime } from '@/src/services/weatherService';

export interface OptimizerInput {
  places: Place[];
  numDays: number;
  transport: 'motorbike' | 'car' | 'walk' | 'bicycle';
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  budgetTotal?: number;
  weatherForecast?: WeatherDay[]; // Optional: for VIP smart optimization
}

export interface ScheduledPlace {
  place: Place;
  startTime: string;
  endTime: string;
  travelTimeToNextMin: number;
  travelDistanceKm: number;
  weatherScore?: number; // only for VIP
  weatherNote?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  places: ScheduledPlace[];
  cost: number;
  routeDistanceKm: number;
  weatherScore?: number;    // avg score for VIP
  weatherSummary?: string;
}

export interface OptimizerResult {
  days: ItineraryDay[];
  totalCost: number;
  totalTravelTime: number;
  totalDistanceKm: number;
  warnings: string[];
  isSmartOptimized: boolean;
}

// Haversine distance in km
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Speed in km/h by transport
function speedKmh(transport: string): number {
  switch (transport) {
    case 'car': return 35;
    case 'motorbike': return 28;
    case 'bicycle': return 15;
    case 'walk': return 5;
    default: return 28;
  }
}

// Parse time string HH:mm to total minutes since midnight
function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function toTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Split places into k clusters (by geographic proximity)
function geoCluster(places: Place[], k: number): Place[][] {
  if (k <= 1 || places.length <= k) {
    const clusters: Place[][] = Array.from({ length: k }, () => []);
    places.forEach((p, i) => clusters[i % k].push(p));
    return clusters;
  }
  // Sort by longitude (East-West spread of Da Nang)
  const sorted = [...places].sort((a, b) => a.lat !== b.lat ? a.lat - b.lat : a.lng - b.lng);
  const clusters: Place[][] = Array.from({ length: k }, () => []);
  sorted.forEach((p, i) => clusters[Math.min(Math.floor(i * k / sorted.length), k - 1)].push(p));
  return clusters;
}

// Nearest-neighbor TSP heuristic for route ordering
function nearestNeighborSort(cluster: Place[]): Place[] {
  if (cluster.length <= 1) return cluster;
  const unvisited = [...cluster];
  // Start from earliest-opening place
  unvisited.sort((a, b) => a.opening_time.localeCompare(b.opening_time));
  let current = unvisited.shift()!;
  const route = [current];
  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineKm(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (d < minDist) { minDist = d; nearestIdx = i; }
    }
    current = unvisited.splice(nearestIdx, 1)[0];
    route.push(current);
  }
  return route;
}

// Weather-aware ordering: best weather score first for top-priority places
function weatherAwareSort(cluster: Place[], weatherDay: WeatherDay): Place[] {
  // Score each place by its weather suitability at best visiting hour
  const scored = cluster.map(place => {
    const openH = parseInt(place.opening_time.split(':')[0]);
    const closeH = parseInt(place.closing_time.split(':')[0]);
    const { startHour, score } = getBestVisitTime(weatherDay.hourly, openH, closeH, place.avg_duration_min || 60);
    return { place, bestHour: startHour, score };
  });

  // Sort by best hour (morning first) then distance
  scored.sort((a, b) => a.bestHour - b.bestHour);
  return scored.map(s => s.place);
}

// ─── MAIN OPTIMIZER ──────────────────────────────────────────────────────────
export function optimizeRoute(input: OptimizerInput): OptimizerResult {
  const { places, numDays, transport, startTime, endTime, budgetTotal, weatherForecast } = input;
  const isSmartOptimized = !!weatherForecast && weatherForecast.length >= numDays;
  const warnings: string[] = [];
  const days: ItineraryDay[] = [];
  let totalCost = 0;
  let totalTravelTime = 0;
  let totalDistanceKm = 0;

  const speed = speedKmh(transport);
  const clusters = geoCluster(places, numDays);

  clusters.forEach((cluster, dayIndex) => {
    if (cluster.length === 0) {
      days.push({
        dayNumber: dayIndex + 1,
        places: [],
        cost: 0,
        routeDistanceKm: 0,
        weatherScore: weatherForecast?.[dayIndex]?.score,
        weatherSummary: weatherForecast?.[dayIndex]?.description,
      });
      return;
    }

    const weatherDay = weatherForecast?.[dayIndex];

    // Order places: smart weather-aware (VIP) or greedy nearest-neighbor (user)
    const orderedCluster = isSmartOptimized && weatherDay
      ? weatherAwareSort(cluster, weatherDay)
      : nearestNeighborSort(cluster);

    const scheduledPlaces: ScheduledPlace[] = [];
    let currentMinutes = toMinutes(startTime);
    let dayCost = 0;
    let dayDistanceKm = 0;

    for (let i = 0; i < orderedCluster.length; i++) {
      const p = orderedCluster[i];
      const openMin = toMinutes(p.opening_time);
      const closeMin = toMinutes(p.closing_time);

      // Wait if arriving before opening
      if (currentMinutes < openMin) currentMinutes = openMin;

      const placeStart = currentMinutes;
      const duration = p.avg_duration_min || 60;
      const placeEnd = placeStart + duration;

      // Check closing time
      if (placeEnd > closeMin) {
        warnings.push(`⚠️ ${p.name}: Có thể đóng cửa trước khi tham quan xong (đóng lúc ${p.closing_time}).`);
      }
      if (placeEnd > toMinutes(endTime)) {
        warnings.push(`⏰ ${p.name}: Vượt quá thời gian kết thúc ngày (${endTime}).`);
      }

      // Travel to next
      let travelTimMin = 0;
      let travelDistKm = 0;
      if (i < orderedCluster.length - 1) {
        const nextP = orderedCluster[i + 1];
        travelDistKm = haversineKm(p.lat, p.lng, nextP.lat, nextP.lng);
        travelTimMin = Math.ceil((travelDistKm / speed) * 60);
        totalTravelTime += travelTimMin;
        dayDistanceKm += travelDistKm;
      }

      // Weather note for VIP
      let weatherScore: number | undefined;
      let weatherNote: string | undefined;
      if (isSmartOptimized && weatherDay) {
        const { score } = getBestVisitTime(
          weatherDay.hourly,
          parseInt(p.opening_time.split(':')[0]),
          parseInt(p.closing_time.split(':')[0]),
          duration
        );
        weatherScore = score;
        if (score < 50) weatherNote = `${weatherDay.icon} ${weatherDay.description} — nên mang ô/áo mưa`;
        else if (score < 75) weatherNote = `${weatherDay.icon} Thời tiết ổn, nhưng lưu ý ${weatherDay.description.toLowerCase()}`;
        else weatherNote = `${weatherDay.icon} Thời tiết lý tưởng`;
      }

      scheduledPlaces.push({
        place: p,
        startTime: toTimeStr(placeStart),
        endTime: toTimeStr(placeEnd),
        travelTimeToNextMin: travelTimMin,
        travelDistanceKm: Math.round(travelDistKm * 10) / 10,
        weatherScore,
        weatherNote,
      });

      // Note: removed entry_fee from cost calculation per user request (no ticket prices)
      dayCost += 0;
      currentMinutes = placeEnd + travelTimMin;
    }

    totalCost += dayCost;
    totalDistanceKm += dayDistanceKm;

    days.push({
      dayNumber: dayIndex + 1,
      places: scheduledPlaces,
      cost: dayCost,
      routeDistanceKm: Math.round(dayDistanceKm * 10) / 10,
      weatherScore: weatherDay?.score,
      weatherSummary: weatherDay ? `${weatherDay.icon} ${weatherDay.description} (${weatherDay.tempMin}–${weatherDay.tempMax}°C)` : undefined,
    });
  });

  if (budgetTotal && totalCost > budgetTotal) {
    warnings.push(`Cảnh báo: Tổng chi phí dự kiến vượt ngân sách.`);
  }

  return { days, totalCost, totalTravelTime, totalDistanceKm: Math.round(totalDistanceKm * 10) / 10, warnings, isSmartOptimized };
}
