import { Place } from '@/src/types/place';
import {
  WeatherDay,
  scoreAtHour,
  rainAtHour,
  getGoldenWindows,
  derivePlaceContext,
  PlaceContext,
  GoldenWindow,
} from '@/src/services/weatherService';
import { addLocalDays } from '@/src/utils/localDate';
import { fetchOSRMMatrix } from '@/src/utils/mapUtils';
import { PLANNING_RULES } from '@/src/features/itinerary/config/planningRules';
import { PLANNING_LIMITS, isValidLocalDate } from '@/src/features/itinerary/config/planningPolicy';

// Re-export để các component GĐ 4 (WeatherTimeline) dùng chung một nguồn kiểu
export type { GoldenWindow, WeatherDay, PlaceContext } from '@/src/services/weatherService';

export interface OptimizerWeights {
  travel: number;
  weather: number;
  open: number;
  ideal: number;
}

export const DEFAULT_WEIGHTS: OptimizerWeights = { travel: 1.0, weather: 1.5, open: 5.0, ideal: 0.5 };

export interface OptimizerInput {
  places: Place[];
  numDays: number;
  transport: 'motorbike' | 'car' | 'walk' | 'bicycle';
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  startDate?: string; // 'YYYY-MM-DD' — để tính ngày thực tế cho mỗi ngày
  weatherForecast?: WeatherDay[];
  weights?: OptimizerWeights; // VIP có thể tinh chỉnh ưu tiên
  lockedDayPlaceIds?: string[][];
  preserveOrder?: boolean;
  slotOverrides?: Record<string, { startTime: string; durationMin: number }>;
}

export interface ScheduledPlace {
  place: Place;
  startTime: string;
  endTime: string;
  travelTimeToNextMin: number;
  travelDistanceKm: number;
  weatherScore?: number;
  weatherNote?: string;
  // ─── Bối cảnh mới (GĐ 4 dùng để hiển thị) ───
  isMeal?: boolean;         // true chỉ dành cho slot nghỉ tổng hợp, không phải nhà hàng thật
  isMealVenue?: boolean;    // địa điểm thật thuộc nhóm ăn uống; vẫn phải lưu place_id
  isIndoor?: boolean;
  sensitivity?: number;
  rainAtHour?: number;      // mm mưa tại giờ thực
  conflict?: string;        // lý do xung đột (đóng cửa / ngày nghỉ / vượt giờ)
}

export type UnscheduledReasonCode =
  | 'DAY_CLOSED'
  | 'OUTSIDE_OPENING_HOURS'
  | 'DAY_CAPACITY_EXCEEDED'
  | 'INVALID_TIME_OVERRIDE';

export interface UnscheduledPlace {
  place: Place;
  dayNumber: number;
  code: UnscheduledReasonCode;
  reason: string;
}

export interface ItineraryDay {
  dayNumber: number;
  date?: string;        // 'YYYY-MM-DD' — ngày thực tế
  places: ScheduledPlace[];
  routeDistanceKm: number;
  weatherScore?: number;
  weatherSummary?: string;
  goldenWindows?: GoldenWindow[]; // khung giờ vàng của ngày (GĐ 4)
  advice?: Advice[];              // lời khuyên gắn với ngày này
  unscheduledPlaces: UnscheduledPlace[];
}

export interface OptimizerResult {
  days: ItineraryDay[];
  totalTravelTime: number;
  totalDistanceKm: number;
  warnings: string[];
  isSmartOptimized: boolean;
  routingStatus: 'road' | 'mixed' | 'estimated' | 'not_needed';
  estimatedRouteDays: number[];
  unscheduledPlaces: UnscheduledPlace[];
  advice?: Advice[]; // toàn bộ lời khuyên hành động
}

// ─── Advice engine types ──────────────────────────────────────────────────────

export type AdviceActionType =
  | 'movePlaceToDay'
  | 'shiftTime'
  | 'swapDays';

export interface AdviceActionPayload {
  dayIndex?: number;
  fromDay?: number;
  placeId?: string;
  suggestHour?: number;
}

export interface Advice {
  id: string;
  severity: 'info' | 'suggest' | 'warning';
  icon: string;                 // ☔ 🔁 ⏰ 🍜 🚗 📅 🌧️
  title: string;
  detail: string;
  dayNumber?: number;
  placeId?: string;
  action?: {
    type: AdviceActionType;
    payload: AdviceActionPayload;
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

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

// Hệ số đường vòng: haversine đánh giá thấp đường thật ~30%
const DETOUR_FACTOR = 1.3;
// Buffer giữa các điểm (tìm chỗ đỗ xe, mua vé...)
const BUFFER_MIN = PLANNING_RULES.transitionBufferMin;

function validateOptimizerInput(input: OptimizerInput): void {
  if (!Number.isInteger(input.numDays)
    || input.numDays < PLANNING_LIMITS.minDays
    || input.numDays > PLANNING_LIMITS.maxDays) {
    throw new Error(`Số ngày phải từ ${PLANNING_LIMITS.minDays} đến ${PLANNING_LIMITS.maxDays}.`);
  }
  if (!Array.isArray(input.places)
    || input.places.length < 1
    || input.places.length > PLANNING_LIMITS.maxSelectedPlaces) {
    throw new Error(`Số địa điểm phải từ 1 đến ${PLANNING_LIMITS.maxSelectedPlaces}.`);
  }
  if (!['motorbike', 'car', 'walk', 'bicycle'].includes(input.transport)) {
    throw new Error('Phương tiện di chuyển không hợp lệ.');
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime)
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.endTime)
    || toMinutes(input.endTime) <= toMinutes(input.startTime)) {
    throw new Error('Khung giờ lập lịch không hợp lệ.');
  }
  if (input.startDate && !isValidLocalDate(input.startDate)) {
    throw new Error('Ngày bắt đầu không hợp lệ.');
  }
  const ids = input.places.map((place) => place.id);
  if (new Set(ids).size !== ids.length) throw new Error('Danh sách địa điểm có id trùng nhau.');
  if (input.places.some((place) => !place.id
    || !Number.isFinite(place.lat)
    || !Number.isFinite(place.lng)
    || Math.abs(place.lat) > 90
    || Math.abs(place.lng) > 180
    || !Number.isFinite(place.avg_duration_min)
    || place.avg_duration_min < PLANNING_LIMITS.minPlaceDurationMin
    || place.avg_duration_min > PLANNING_LIMITS.maxPlaceDurationMin)) {
    throw new Error('Địa điểm có tọa độ hoặc thời lượng không hợp lệ.');
  }
  if (input.lockedDayPlaceIds && input.lockedDayPlaceIds.length !== input.numDays) {
    throw new Error('Số nhóm địa điểm không khớp số ngày.');
  }
  if (input.slotOverrides && Object.entries(input.slotOverrides).some(([placeId, override]) =>
    !ids.includes(placeId)
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(override.startTime)
    || !Number.isInteger(override.durationMin)
    || override.durationMin < PLANNING_LIMITS.minSlotDurationMin
    || override.durationMin > PLANNING_LIMITS.maxSlotDurationMin)) {
    throw new Error('Tùy chỉnh giờ tham quan không hợp lệ.');
  }
}

// Parse time string HH:mm to total minutes since midnight
export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function toTimeStr(minutes: number): string {
  if (!Number.isFinite(minutes)) throw new Error('Số phút không hợp lệ.');
  // Không modulo 24: một lịch vượt ngày không bao giờ được ngụy trang thành giờ sáng hôm sau.
  const bounded = Math.min(23 * 60 + 59, Math.max(0, Math.round(minutes)));
  const h = Math.floor(bounded / 60);
  const m = bounded % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Tính ngày thực tế (YYYY-MM-DD) từ startDate + số ngày offset — an toàn timezone GMT+7. */
export function addDays(startDate: string, offset: number): string {
  return addLocalDays(startDate, offset);
}

/** Thứ trong tuần theo quy ước DB (1=Thứ Hai … 7=Chủ Nhật) từ chuỗi YYYY-MM-DD. */
export function isoWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const jsDay = new Date(y, (m || 1) - 1, d || 1).getDay(); // 0=CN..6=T7
  return jsDay === 0 ? 7 : jsDay;
}

/** Label tiếng Việt cho phương tiện */
export function transportLabel(transport: string): string {
  switch (transport) {
    case 'motorbike': return 'Xe máy';
    case 'car': return 'Ô tô';
    case 'walk': return 'Đi bộ';
    case 'bicycle': return 'Xe đạp';
    default: return transport;
  }
}

/** Format ngày tiếng Việt: "Thứ Hai, 04/08" */
export function formatDateVi(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dow = days[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dow}, ${dd}/${mm}`;
}

// ─── Geographic clustering (k-means) ──────────────────────────────────────────

/**
 * kMeansCluster — gom cụm địa lý thực sự bằng Lloyd k-means.
 * Seed deterministic (k-means++ chọn điểm xa nhất, KHÔNG dùng Math.random)
 * để kết quả ổn định & test được. Khoảng cách = haversine.
 */
export function kMeansCluster(places: Place[], k: number): Place[][] {
  const n = places.length;
  if (k <= 1) return [places.slice()];
  if (n === 0) return Array.from({ length: k }, () => []);
  if (n <= k) {
    // Mỗi điểm một cụm, cụm dư để rỗng
    const clusters: Place[][] = Array.from({ length: k }, () => []);
    places.forEach((p, i) => clusters[i].push(p));
    return clusters;
  }

  // ── Seed k-means++ deterministic ──
  const seeds: number[] = [0]; // bắt đầu từ điểm đầu tiên
  while (seeds.length < k) {
    let farthestIdx = -1;
    let farthestDist = -1;
    for (let i = 0; i < n; i++) {
      if (seeds.includes(i)) continue;
      // khoảng cách tới centroid gần nhất trong seeds
      let minToSeed = Infinity;
      for (const s of seeds) {
        const d = haversineKm(places[i].lat, places[i].lng, places[s].lat, places[s].lng);
        if (d < minToSeed) minToSeed = d;
      }
      if (minToSeed > farthestDist) { farthestDist = minToSeed; farthestIdx = i; }
    }
    if (farthestIdx === -1) break; // tất cả trùng toạ độ
    seeds.push(farthestIdx);
  }

  let centroids = seeds.map((s) => ({ lat: places[s].lat, lng: places[s].lng }));
  let assignment = new Array(n).fill(0);

  for (let iter = 0; iter < 20; iter++) {
    // Gán mỗi điểm vào centroid gần nhất
    let changed = false;
    for (let i = 0; i < n; i++) {
      let bestC = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = haversineKm(places[i].lat, places[i].lng, centroids[c].lat, centroids[c].lng);
        if (d < bestD) { bestD = d; bestC = c; }
      }
      if (assignment[i] !== bestC) { assignment[i] = bestC; changed = true; }
    }

    // Cập nhật centroid
    const sums = centroids.map(() => ({ lat: 0, lng: 0, count: 0 }));
    for (let i = 0; i < n; i++) {
      const c = assignment[i];
      sums[c].lat += places[i].lat;
      sums[c].lng += places[i].lng;
      sums[c].count++;
    }
    centroids = sums.map((s, c) =>
      s.count > 0 ? { lat: s.lat / s.count, lng: s.lng / s.count } : centroids[c]
    );

    if (!changed && iter > 0) break; // hội tụ
  }

  const clusters: Place[][] = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) clusters[assignment[i]].push(places[i]);
  return clusters;
}

/**
 * geoCluster — giữ chữ ký cũ `(places, k) => Place[][]` để tương thích caller hiện tại.
 * Ruột đã thay bằng k-means địa lý thực sự.
 */
export function geoCluster(places: Place[], k: number): Place[][] {
  return kMeansCluster(places, k);
}

// ─── Route ordering (exact for small days, multi-start + 2-opt otherwise) ────

const EXACT_WEIGHTED_ORDER_LIMIT = 8;

// Nearest-neighbor TSP heuristic for route ordering (khởi tạo)
function nearestNeighborSort(cluster: Place[], dist: (a: Place, b: Place) => number, start?: Place): Place[] {
  if (cluster.length <= 1) return cluster.slice();
  const sorted = [...cluster].sort((a, b) => (a.opening_time ?? '08:00').localeCompare(b.opening_time ?? '08:00'));
  let current = start ?? sorted[0];
  const unvisited = sorted.filter((place) => place.id !== current.id);
  const route = [current];
  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = dist(current, unvisited[i]);
      if (d < minDist) { minDist = d; nearestIdx = i; }
    }
    current = unvisited.splice(nearestIdx, 1)[0];
    route.push(current);
  }
  return route;
}

/** Tổng chi phí của một tuyến theo hàm chi phí đã cho. */
function totalCostOf(route: Place[], costFn: (route: Place[]) => number): number {
  return costFn(route);
}

function exactWeightedOrder(places: Place[], costFn: (route: Place[]) => number): Place[] {
  let best = places.slice();
  let bestCost = totalCostOf(best, costFn);
  const path: Place[] = [];
  const used = new Set<string>();

  const visit = () => {
    if (path.length === places.length) {
      const candidateCost = totalCostOf(path, costFn);
      if (candidateCost < bestCost - 1e-9) {
        best = path.slice();
        bestCost = candidateCost;
      }
      return;
    }
    places.forEach((place) => {
      if (used.has(place.id)) return;
      used.add(place.id);
      path.push(place);
      visit();
      path.pop();
      used.delete(place.id);
    });
  };

  visit();
  return best;
}

function improveTwoOpt(initial: Place[], costFn: (route: Place[]) => number): Place[] {
  let best = initial;
  let bestCost = totalCostOf(best, costFn);
  let improved = true;
  let guard = 0;
  while (improved && guard < 50) {
    improved = false;
    guard++;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = best.slice(0, i)
          .concat(best.slice(i, j + 1).reverse())
          .concat(best.slice(j + 1));
        const candidateCost = totalCostOf(candidate, costFn);
        if (candidateCost < bestCost - 1e-9) {
          best = candidate;
          bestCost = candidateCost;
          improved = true;
        }
      }
    }
  }
  return best;
}

/**
 * orderDay — duyệt chính xác cho ngày nhỏ; multi-start nearest-neighbor + 2-opt cho ngày lớn.
 * costFn: hàm chi phí tổng hợp (khoảng cách + thời tiết + giờ mở...).
 * Đảm bảo không bao giờ tăng chi phí so với lời giải khởi tạo.
 */
export function orderDay(
  places: Place[],
  costFn: (route: Place[]) => number,
  dist: (a: Place, b: Place) => number
): Place[] {
  if (places.length <= 1) return places.slice();
  if (places.length <= EXACT_WEIGHTED_ORDER_LIMIT) return exactWeightedOrder(places, costFn);

  let best = improveTwoOpt(nearestNeighborSort(places, dist), costFn);
  let bestCost = totalCostOf(best, costFn);
  for (const start of places) {
    const candidate = improveTwoOpt(nearestNeighborSort(places, dist, start), costFn);
    const candidateCost = totalCostOf(candidate, costFn);
    if (candidateCost < bestCost - 1e-9) {
      best = candidate;
      bestCost = candidateCost;
    }
  }
  return best;
}

// ─── Distance / travel matrix ─────────────────────────────────────────────────

export interface TravelMatrix {
  /** phút di chuyển từ i → j */
  timeMin: (i: number, j: number) => number;
  /** km từ i → j */
  distKm: (i: number, j: number) => number;
}

/** Ma trận haversine đồng bộ (fallback offline). */
function haversineMatrix(places: Place[], transport: string): TravelMatrix {
  const speed = speedKmh(transport);
  const distKm = (i: number, j: number) =>
    haversineKm(places[i].lat, places[i].lng, places[j].lat, places[j].lng) * DETOUR_FACTOR;
  const timeMin = (i: number, j: number) => Math.ceil((distKm(i, j) / speed) * 60);
  return { timeMin, distKm };
}

// ─── Unified route cost ───────────────────────────────────────────────────────

const IDEAL_WINDOWS: Record<string, [number, number]> = {
  morning: [6, 11],
  noon: [11, 13],
  afternoon: [13, 17],
  evening: [17, 21],
  any: [0, 24],
};

/**
 * routeCost — hàm chi phí thống nhất (dùng cho 2-opt).
 * Mô phỏng nhanh giờ đến từng điểm để chấm thời tiết & phạt giờ mở cửa.
 */
export function routeCost(
  route: Place[],
  opts: {
    transport: string;
    startMin: number;
    weatherDay?: WeatherDay;
    date?: string;
    weights?: OptimizerWeights;
    contexts?: Map<string, PlaceContext>;
    travel?: (from: Place, to: Place) => { timeMin: number; distKm: number };
  }
): number {
  const w = opts.weights ?? DEFAULT_WEIGHTS;
  const speed = speedKmh(opts.transport);
  const weekday = opts.date ? isoWeekday(opts.date) : undefined;

  let cost = 0;
  let cur = opts.startMin;

  for (let i = 0; i < route.length; i++) {
    const p = route[i];
    const ctx = opts.contexts?.get(p.id) ?? derivePlaceContext(p);
    const openMin = toMinutes(p.opening_time || '07:00');
    const closeMin = toMinutes(p.closing_time || '22:00');
    const openingWindow = resolveOpeningWindow(cur, openMin, closeMin);
    cur = openingWindow.startMin;

    const duration = p.avg_duration_min;
    const startHour = cur / 60;

    // 1) Thời tiết tại giờ thực
    if (opts.weatherDay) {
      const s = scoreAtHour(opts.weatherDay.hourly, startHour, ctx.sensitivity, ctx.isIndoor);
      cost += w.weather * (100 - s);
    }

    // 2) Phạt giờ mở/đóng & ngày nghỉ
    const end = cur + duration;
    if (end > openingWindow.closeMin) cost += w.open * 100;
    if (weekday !== undefined && Array.isArray(p.opening_days) && p.opening_days.length > 0
        && !p.opening_days.includes(weekday)) {
      cost += w.open * 100;
    }

    // 3) Lệch khung giờ lý tưởng
    const [lo, hi] = IDEAL_WINDOWS[ctx.idealTimeOfDay] ?? IDEAL_WINDOWS.any;
    if (startHour < lo) cost += w.ideal * (lo - startHour) * 10;
    else if (startHour > hi) cost += w.ideal * (startHour - hi) * 10;

    // 4) Di chuyển tới điểm kế
    cur = end + BUFFER_MIN;
    if (i < route.length - 1) {
      const next = route[i + 1];
      const edge = opts.travel?.(p, next);
      const km = edge?.distKm ?? haversineKm(p.lat, p.lng, next.lat, next.lng) * DETOUR_FACTOR;
      const travel = edge?.timeMin ?? Math.ceil((km / speed) * 60);
      cost += w.travel * travel;
      cur += travel;
    }
  }
  return cost;
}

// ─── Core scheduling logic ────────────────────────────────────────────────────

// Khung bữa ăn (phút kể từ 00:00)
const LUNCH: [number, number] = [PLANNING_RULES.mealWindows.lunch.startMin, PLANNING_RULES.mealWindows.lunch.endMin];
const DINNER: [number, number] = [PLANNING_RULES.mealWindows.dinner.startMin, PLANNING_RULES.mealWindows.dinner.endMin];

function resolveOpeningWindow(arrivalMin: number, openMin: number, closeMin: number) {
  if (openMin === closeMin) return { startMin: arrivalMin, closeMin: 24 * 60 };
  if (openMin < closeMin) {
    return { startMin: Math.max(arrivalMin, openMin), closeMin };
  }
  // Khung qua đêm, ví dụ 20:00–02:00. Trình lập lịch kết thúc trong cùng ngày,
  // vì vậy nhánh buổi tối có thể dùng tới 24:00 nhưng không bao giờ tràn ngày.
  if (arrivalMin < closeMin) return { startMin: arrivalMin, closeMin };
  return { startMin: Math.max(arrivalMin, openMin), closeMin: 24 * 60 };
}

function isStartInsideOpeningHours(startMin: number, openMin: number, closeMin: number): boolean {
  if (openMin === closeMin) return true;
  return openMin < closeMin
    ? startMin >= openMin && startMin < closeMin
    : startMin >= openMin || startMin < closeMin;
}

function overlapsWindow(startMin: number, endMin: number, window: [number, number]): boolean {
  return startMin < window[1] && endMin > window[0];
}

/**
 * scheduleDay — Lập lịch cho MỘT ngày với thứ tự địa điểm CỐ ĐỊNH (không cluster lại).
 * Dùng ở Step 3 create.tsx khi người dùng đã tự xếp thứ tự.
 * GIỮ NGUYÊN chữ ký công khai. Đã nâng cấp:
 *  - chấm điểm thời tiết theo GIỜ THỰC (không phải giờ tốt nhất)
 *  - chèn bữa ăn + buffer, kiểm opening_days
 *
 * @param orderedPlaces - Danh sách địa điểm theo thứ tự người dùng đã xếp
 * @param transport     - Phương tiện di chuyển
 * @param startDate     - Ngày bắt đầu tổng (YYYY-MM-DD), dùng để tính date thực tế
 * @param dayIndex      - Index ngày (0-based), dùng để tính date thực tế
 * @param weatherDay    - Dữ liệu thời tiết (tùy chọn, cho VIP)
 * @param startTimeStr  - Giờ bắt đầu (mặc định '08:00')
 * @param endTimeStr    - Giờ kết thúc (mặc định '21:00')
 * @param slotOverrides - Các tùy chỉnh giờ do người dùng định nghĩa (dựa theo placeId)
 */
export function scheduleDay(
  orderedPlaces: Place[],
  transport: string,
  startDate?: string,
  dayIndex: number = 0,
  weatherDay?: WeatherDay,
  startTimeStr: string = '08:00',
  endTimeStr: string = '21:00',
  slotOverrides?: Record<string, { startTime: string; durationMin: number }>,
  travel?: (from: Place, to: Place) => { timeMin: number; distKm: number }
): ItineraryDay {
  const speed = speedKmh(transport);
  const scheduledPlaces: ScheduledPlace[] = [];
  const unscheduledPlaces: UnscheduledPlace[] = [];
  const dayStartMin = toMinutes(startTimeStr);
  const dayEndMin = toMinutes(endTimeStr);
  let currentEndMin = dayStartMin;
  let dayDistanceKm = 0;
  const date = startDate ? addDays(startDate, dayIndex) : undefined;
  const weekday = date ? isoWeekday(date) : undefined;
  let lunchInserted = false;
  let dinnerInserted = false;
  let lastAcceptedPlace: Place | undefined;
  let lastAcceptedSlotIndex: number | undefined;

  for (let i = 0; i < orderedPlaces.length; i++) {
    const p = orderedPlaces[i];
    const ctx = derivePlaceContext(p);
    const openMin = toMinutes(p.opening_time || '07:00');
    const closeMin = toMinutes(p.closing_time || '22:00');
    const override = slotOverrides?.[p.id];
    const edge = lastAcceptedPlace
      ? travel?.(lastAcceptedPlace, p)
        ?? (() => {
          const distKm = haversineKm(lastAcceptedPlace!.lat, lastAcceptedPlace!.lng, p.lat, p.lng) * DETOUR_FACTOR;
          return { distKm, timeMin: Math.ceil((distKm / speed) * 60) };
        })()
      : { distKm: 0, timeMin: 0 };
    const arrivalMin = currentEndMin + (lastAcceptedPlace ? BUFFER_MIN + edge.timeMin : 0);

    if (weekday !== undefined && Array.isArray(p.opening_days) && p.opening_days.length > 0
        && !p.opening_days.includes(weekday)) {
      unscheduledPlaces.push({
        place: p,
        dayNumber: dayIndex + 1,
        code: 'DAY_CLOSED',
        reason: `Không mở cửa ${formatWeekday(weekday)}`,
      });
      continue;
    }

    let pendingMeal: ScheduledPlace | undefined;
    let candidateArrival = arrivalMin;
    if (!override && !ctx.isMealVenue) {
      const mealDuration = PLANNING_RULES.mealBreakDurationMin;
      if (!dinnerInserted && candidateArrival >= DINNER[0]) {
        pendingMeal = makeMealSlot('Ăn tối (tự chọn)', candidateArrival);
        candidateArrival += mealDuration;
      } else if (!lunchInserted && candidateArrival >= LUNCH[0]) {
        pendingMeal = makeMealSlot('Ăn trưa (tự chọn)', candidateArrival);
        candidateArrival += mealDuration;
      }
    }

    let placeStart: number;
    let effectiveCloseMin: number;
    if (override) {
      placeStart = toMinutes(override.startTime);
      if (placeStart < arrivalMin || placeStart < dayStartMin || placeStart >= dayEndMin) {
        unscheduledPlaces.push({
          place: p,
          dayNumber: dayIndex + 1,
          code: 'INVALID_TIME_OVERRIDE',
          reason: 'Giờ đã chỉnh bị chồng lấn hoặc nằm ngoài khung của ngày.',
        });
        continue;
      }
      if (!isStartInsideOpeningHours(placeStart, openMin, closeMin)) {
        unscheduledPlaces.push({
          place: p,
          dayNumber: dayIndex + 1,
          code: 'OUTSIDE_OPENING_HOURS',
          reason: `Không mở cửa vào ${override.startTime}`,
        });
        continue;
      }
      effectiveCloseMin = openMin > closeMin && placeStart >= openMin ? 24 * 60 : closeMin;
    } else {
      const window = resolveOpeningWindow(candidateArrival, openMin, closeMin);
      placeStart = window.startMin;
      effectiveCloseMin = window.closeMin;
    }

    const duration = override?.durationMin ?? (p.avg_duration_min || PLANNING_RULES.defaultVisitDurationMin);
    const placeEnd = placeStart + duration;

    if (placeEnd > effectiveCloseMin) {
      unscheduledPlaces.push({
        place: p,
        dayNumber: dayIndex + 1,
        code: 'OUTSIDE_OPENING_HOURS',
        reason: `Không đủ thời gian tham quan trước khi đóng cửa lúc ${p.closing_time || '22:00'}`,
      });
      continue;
    }
    if (placeEnd > dayEndMin || placeEnd >= 24 * 60) {
      unscheduledPlaces.push({
        place: p,
        dayNumber: dayIndex + 1,
        code: 'DAY_CAPACITY_EXCEEDED',
        reason: `Không còn đủ thời gian trước ${endTimeStr}`,
      });
      continue;
    }

    // Thời tiết theo GIỜ THỰC (sửa lỗi hiển thị điểm giờ tốt nhất)
    let weatherScore: number | undefined;
    let weatherNote: string | undefined;
    let rain: number | undefined;
    if (weatherDay) {
      const startHour = placeStart / 60;
      weatherScore = scoreAtHour(weatherDay.hourly, startHour, ctx.sensitivity, ctx.isIndoor);
      rain = rainAtHour(weatherDay.hourly, startHour);
      const rainNote = rain > 2 && !ctx.isIndoor ? ` ☔ ${Math.round(rain)}mm mưa lúc ${toTimeStr(placeStart)} — mang ô` : '';
      if (weatherScore < 50) weatherNote = `${weatherDay.icon} Điều kiện xấu tại giờ này${rainNote}`;
      else if (weatherScore < 75) weatherNote = `${weatherDay.icon} Thời tiết ổn${rainNote}`;
      else weatherNote = `${ctx.isIndoor ? '🏛️' : '☀️'} Giờ đẹp để tham quan`;
    }

    if (lastAcceptedSlotIndex !== undefined) {
      scheduledPlaces[lastAcceptedSlotIndex].travelTimeToNextMin = edge.timeMin;
      scheduledPlaces[lastAcceptedSlotIndex].travelDistanceKm = Math.round(edge.distKm * 10) / 10;
      dayDistanceKm += edge.distKm;
    }
    if (pendingMeal) {
      scheduledPlaces.push(pendingMeal);
      if (pendingMeal.place.name.startsWith('Ăn trưa')) lunchInserted = true;
      if (pendingMeal.place.name.startsWith('Ăn tối')) dinnerInserted = true;
    }

    const acceptedSlotIndex = scheduledPlaces.length;
    scheduledPlaces.push({
      place: p,
      startTime: toTimeStr(placeStart),
      endTime: toTimeStr(placeEnd),
      travelTimeToNextMin: 0,
      travelDistanceKm: 0,
      weatherScore,
      weatherNote,
      isMeal: false,
      isMealVenue: ctx.isMealVenue,
      isIndoor: ctx.isIndoor,
      sensitivity: ctx.sensitivity,
      rainAtHour: rain,
    });
    if (ctx.isMealVenue) {
      if (overlapsWindow(placeStart, placeEnd, LUNCH)) lunchInserted = true;
      if (overlapsWindow(placeStart, placeEnd, DINNER)) dinnerInserted = true;
    }
    currentEndMin = placeEnd;
    lastAcceptedPlace = p;
    lastAcceptedSlotIndex = acceptedSlotIndex;
  }

  // Khung giờ vàng của ngày (dựa trên độ nhạy trung bình các điểm ngoài trời)
  let goldenWindows: GoldenWindow[] | undefined;
  if (weatherDay) {
    const outdoor = scheduledPlaces
      .filter((slot) => !slot.isMeal)
      .map((slot) => derivePlaceContext(slot.place))
      .filter((context) => !context.isIndoor);
    const avgSens = outdoor.length > 0
      ? outdoor.reduce((a, c) => a + c.sensitivity, 0) / outdoor.length
      : 0.7;
    goldenWindows = getGoldenWindows(weatherDay.hourly, avgSens, false);
  }

  return {
    dayNumber: dayIndex + 1,
    date,
    places: scheduledPlaces,
    routeDistanceKm: Math.round(dayDistanceKm * 10) / 10,
    weatherScore: weatherDay?.score,
    weatherSummary: weatherDay
      ? `${weatherDay.icon} ${weatherDay.description} (${weatherDay.tempMin}–${weatherDay.tempMax}°C)`
      : undefined,
    goldenWindows,
    unscheduledPlaces,
  };
}

function makeMealSlot(name: string, startMin: number): ScheduledPlace {
  const placeholder = {
    id: `meal-${name}-${startMin}`,
    name,
    category: 'food',
    avg_duration_min: 60,
  } as unknown as Place;
  return {
    place: placeholder,
    startTime: toTimeStr(startMin),
    endTime: toTimeStr(startMin + PLANNING_RULES.mealBreakDurationMin),
    travelTimeToNextMin: 0,
    travelDistanceKm: 0,
    isMeal: true,
  };
}

function formatWeekday(weekday: number): string {
  const names = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
  return names[weekday] || `thứ ${weekday}`;
}

// ─── Advice engine ────────────────────────────────────────────────────────────

/**
 * advise — sinh danh sách "lời khuyên hành động" từ các ngày đã lập lịch.
 * Mỗi Advice.action map thẳng vào handler có sẵn trong create.tsx.
 */
export function advise(days: ItineraryDay[]): Advice[] {
  const out: Advice[] = [];
  const distances = days.map((d) => d.routeDistanceKm || 0);
  const avgDist = distances.length ? distances.reduce((a, b) => a + b, 0) / distances.length : 0;

  days.forEach((day, dayIdx) => {
    // 🌧️ Ngày quá xấu
    if (day.weatherScore !== undefined && day.weatherScore < 40) {
      out.push({
        id: `bad-day-${dayIdx}`,
        severity: 'warning',
        icon: '🌧️',
        title: `Ngày ${day.dayNumber} thời tiết xấu (${day.weatherScore}đ)`,
        detail: 'Nên ưu tiên hoạt động trong nhà hoặc cân nhắc đổi ngày.',
        dayNumber: day.dayNumber,
      });
    }

    // 🚗 Ngày lệch tải
    if (avgDist > 0 && day.routeDistanceKm > avgDist * 1.6 && days.length > 1) {
      out.push({
        id: `overloaded-${dayIdx}`,
        severity: 'suggest',
        icon: '🚗',
        title: `Ngày ${day.dayNumber} di chuyển nhiều (${day.routeDistanceKm}km)`,
        detail: `Vượt ${Math.round((day.routeDistanceKm / avgDist - 1) * 100)}% so với trung bình. Cân nhắc chuyển bớt điểm sang ngày khác.`,
        dayNumber: day.dayNumber,
        action: { type: 'movePlaceToDay', payload: { fromDay: dayIdx } },
      });
    }

    // 🍜 Thiếu bữa: ngày dài > 6 tiếng không có slot bữa
    const realSlots = day.places.filter((s) => !s.isMeal);
    if (realSlots.length > 0) {
      const first = toMinutes(realSlots[0].startTime);
      const last = toMinutes(realSlots[realSlots.length - 1].endTime);
      const hasMeal = day.places.some((s) => s.isMeal);
      if (last - first > 6 * 60 && !hasMeal) {
        out.push({
          id: `no-meal-${dayIdx}`,
          severity: 'info',
          icon: '🍜',
          title: `Ngày ${day.dayNumber} chưa có khung ăn`,
          detail: 'Ngày kéo dài hơn 6 tiếng — nên chèn bữa trưa/tối để nghỉ.',
          dayNumber: day.dayNumber,
        });
      }
    }

    day.places.forEach((slot, slotIdx) => {
      if (slot.isMeal) return;
      const p = slot.place;

      // 📅 Ngày nghỉ
      if (slot.conflict && slot.conflict.startsWith('Không mở cửa')) {
        out.push({
          id: `closed-day-${dayIdx}-${slotIdx}`,
          severity: 'warning',
          icon: '📅',
          title: `${p.name} ${slot.conflict.toLowerCase()}`,
          detail: 'Địa điểm không mở vào ngày này — nên đổi sang ngày khác.',
          dayNumber: day.dayNumber,
          placeId: p.id,
          action: { type: 'swapDays', payload: { dayIndex: dayIdx, placeId: p.id } },
        });
        return;
      }

      // ⏰ Đóng cửa / vượt giờ
      if (slot.conflict) {
        out.push({
          id: `overtime-${dayIdx}-${slotIdx}`,
          severity: 'warning',
          icon: '⏰',
          title: `${p.name}: ${slot.conflict}`,
          detail: 'Nên dời điểm này sớm hơn trong ngày.',
          dayNumber: day.dayNumber,
          placeId: p.id,
          action: { type: 'shiftTime', payload: { dayIndex: dayIdx, placeId: p.id } },
        });
      }

      // ☔ Né mưa: điểm ngoài trời rơi vào khung mưa & có golden window khác trong ngày
      if (!slot.isIndoor && (slot.rainAtHour ?? 0) > 2 && slot.weatherScore !== undefined && slot.weatherScore < 60) {
        const slotHour = toMinutes(slot.startTime) / 60;
        const better = (day.goldenWindows || []).find((g) => g.startHour > slotHour + 1 || g.endHour < slotHour - 1);
        if (better) {
          out.push({
            id: `avoid-rain-${dayIdx}-${slotIdx}`,
            severity: 'suggest',
            icon: '☔',
            title: `Tránh mưa tại ${p.name}`,
            detail: `${slot.startTime} dự báo mưa ${Math.round(slot.rainAtHour!)}mm. Khung ${toTimeStr(better.startHour * 60)}–${toTimeStr(better.endHour * 60)} khô ráo hơn (${better.avgScore}đ).`,
            dayNumber: day.dayNumber,
            placeId: p.id,
            action: { type: 'shiftTime', payload: { dayIndex: dayIdx, placeId: p.id, suggestHour: better.startHour } },
          });
        }
      }
    });
  });

  return out;
}

// ─── MAIN OPTIMIZER (đồng bộ, fallback haversine) ─────────────────────────────
export function optimizeRoute(input: OptimizerInput): OptimizerResult {
  validateOptimizerInput(input);
  const { places, numDays, transport, startTime, endTime, startDate, weatherForecast, weights } = input;
  const isSmartOptimized = !!weatherForecast && weatherForecast.length >= numDays;
  const warnings: string[] = [];
  const days: ItineraryDay[] = [];
  let totalTravelTime = 0;
  let totalDistanceKm = 0;

  const clusters = kMeansCluster(places, numDays);

  clusters.forEach((cluster, dayIndex) => {
    const weatherDay = weatherForecast?.[dayIndex];
    const date = startDate ? addDays(startDate, dayIndex) : undefined;

    if (cluster.length === 0) {
      days.push({
        dayNumber: dayIndex + 1,
        date,
        places: [],
        routeDistanceKm: 0,
        unscheduledPlaces: [],
        weatherScore: weatherDay?.score,
        weatherSummary: weatherDay?.description,
      });
      return;
    }

    // Sắp thứ tự bằng nearest-neighbor + 2-opt trên hàm chi phí thống nhất
    const dist = (a: Place, b: Place) => haversineKm(a.lat, a.lng, b.lat, b.lng) * DETOUR_FACTOR;
    const costFn = (route: Place[]) => routeCost(route, {
      transport,
      startMin: toMinutes(startTime),
      weatherDay,
      date,
      weights,
    });
    const orderedCluster = orderDay(cluster, costFn, dist);

    // Lập lịch chi tiết theo giờ thực, bữa ăn và thời gian đệm.
    const day = scheduleDay(orderedCluster, transport, startDate, dayIndex, weatherDay, startTime, endTime);

    day.unscheduledPlaces.forEach((item) => {
      warnings.push(`⚠️ ${item.place.name}: ${item.reason}.`);
    });
    // Giữ tương thích với dữ liệu lịch cũ có conflict.
    day.places.forEach((slot) => {
      if (slot.conflict) warnings.push(`⚠️ ${slot.place.name}: ${slot.conflict}.`);
    });

    day.places.forEach((s) => { totalTravelTime += s.travelTimeToNextMin; });
    totalDistanceKm += day.routeDistanceKm;
    days.push(day);
  });

  const allAdvice = weatherForecast ? advise(days) : advise(days);
  days.forEach((d) => { d.advice = allAdvice.filter((a) => a.dayNumber === d.dayNumber); });

  return {
    days,
    totalTravelTime,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    warnings,
    isSmartOptimized,
    routingStatus: places.length < 2 ? 'not_needed' : 'estimated',
    estimatedRouteDays: days.filter((day) => day.places.filter((slot) => !slot.isMeal).length >= 2).map((day) => day.dayNumber),
    unscheduledPlaces: days.flatMap((day) => day.unscheduledPlaces),
    advice: allAdvice,
  };
}

// ─── ASYNC OPTIMIZER (dùng OSRM /table, fallback haversine) ────────────────────
/**
 * optimizeItinerary — bản async dùng ma trận thời gian đường thật (OSRM).
 * Có fallback haversine khi offline/lỗi mạng. Kết quả cùng shape optimizeRoute.
 */
export async function optimizeItinerary(input: OptimizerInput): Promise<OptimizerResult> {
  validateOptimizerInput(input);
  const { places, numDays, transport, startTime, endTime, startDate, weatherForecast, weights, lockedDayPlaceIds, preserveOrder, slotOverrides } = input;
  const placeById = new Map(places.map(place => [place.id, place]));
  if (lockedDayPlaceIds) {
    const lockedIds = lockedDayPlaceIds.flat();
    const uniqueIds = new Set(lockedIds);
    if (uniqueIds.size !== lockedIds.length
      || lockedIds.some((id) => !placeById.has(id))
      || places.some((place) => !uniqueIds.has(place.id))) {
      throw new Error('Phân bổ địa điểm theo ngày không đầy đủ hoặc chứa địa điểm trùng lặp.');
    }
  }
  const clusters = lockedDayPlaceIds
    ? lockedDayPlaceIds.map(ids => ids.map(id => placeById.get(id)).filter((place): place is Place => !!place))
    : kMeansCluster(places, numDays);
  const warnings: string[] = [];
  const days: ItineraryDay[] = [];
  let totalTravelTime = 0;
  let totalDistanceKm = 0;

  const matrices = await Promise.all(clusters.map(async (cluster) => {
    if (cluster.length < 2) return null;
    return fetchOSRMMatrix(cluster.map((p) => ({ latitude: p.lat, longitude: p.lng })), transport);
  }));

  clusters.forEach((cluster, dayIndex) => {
    const weatherDay = weatherForecast?.[dayIndex];
    const date = startDate ? addDays(startDate, dayIndex) : undefined;
    const matrix = matrices[dayIndex];
    const indexById = new Map(cluster.map((place, index) => [place.id, index]));
    const fallback = haversineMatrix(cluster, transport);
    const travel = (from: Place, to: Place) => {
      const i = indexById.get(from.id)!;
      const j = indexById.get(to.id)!;
      const duration = matrix?.durations?.[i]?.[j];
      const distance = matrix?.distances?.[i]?.[j];
      return {
        timeMin: typeof duration === 'number' && Number.isFinite(duration) ? Math.ceil(duration / 60) : fallback.timeMin(i, j),
        distKm: typeof distance === 'number' && Number.isFinite(distance) ? distance / 1000 : fallback.distKm(i, j),
      };
    };

    if (!matrix && cluster.length >= 2) warnings.push(`Ngày ${dayIndex + 1}: không lấy được dữ liệu đường thật, đã dùng ước tính ngoại tuyến.`);
    if (cluster.length === 0) {
      days.push({ dayNumber: dayIndex + 1, date, places: [], routeDistanceKm: 0, unscheduledPlaces: [] });
      return;
    }

    const ordered = preserveOrder ? cluster.slice() : orderDay(
      cluster,
      (route) => routeCost(route, { transport, startMin: toMinutes(startTime), weatherDay, date, weights, travel }),
      (a, b) => travel(a, b).distKm
    );
    const day = scheduleDay(ordered, transport, startDate, dayIndex, weatherDay, startTime, endTime, slotOverrides, travel);
    day.unscheduledPlaces.forEach((item) => {
      warnings.push(`⚠️ ${item.place.name}: ${item.reason}.`);
    });
    day.places.forEach((slot) => {
      totalTravelTime += slot.travelTimeToNextMin;
      if (slot.conflict) warnings.push(`⚠️ ${slot.place.name}: ${slot.conflict}.`);
    });
    totalDistanceKm += day.routeDistanceKm;
    days.push(day);
  });

  const allAdvice = advise(days);
  const routedDayIndexes = clusters
    .map((cluster, index) => cluster.length >= 2 ? index : -1)
    .filter((index) => index >= 0);
  const estimatedRouteDays = routedDayIndexes
    .filter((index) => !matrices[index])
    .map((index) => index + 1);
  const roadDayCount = routedDayIndexes.length - estimatedRouteDays.length;
  const routingStatus: OptimizerResult['routingStatus'] = routedDayIndexes.length === 0
    ? 'not_needed'
    : roadDayCount === 0
      ? 'estimated'
      : estimatedRouteDays.length > 0 ? 'mixed' : 'road';
  days.forEach((day) => { day.advice = allAdvice.filter((item) => item.dayNumber === day.dayNumber); });
  return {
    days,
    totalTravelTime,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    warnings,
    isSmartOptimized: routingStatus === 'road' || routingStatus === 'mixed',
    routingStatus,
    estimatedRouteDays,
    unscheduledPlaces: days.flatMap((day) => day.unscheduledPlaces),
    advice: allAdvice,
  };
}
