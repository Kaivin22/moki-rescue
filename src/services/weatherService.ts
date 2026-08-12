import { PLANNING_RULES } from '@/src/features/itinerary/config/planningRules';
import { DA_NANG_CENTER } from '@/src/features/location/config/danang';
import { addLocalDays, localDateDifference, todayInTimeZone } from '@/src/utils/localDate';
import type { Place } from '../types/place';

/**
 * Weather Service using Open-Meteo API (free, no key needed)
 * Fetches real weather forecasts for Da Nang locations
 */

export interface WeatherHourly {
  hour: number;
  temp: number;       // Celsius
  rain: number;       // mm
  windSpeed: number;  // km/h
  weatherCode: number;
  description: string;
  icon: string;
}

export interface WeatherDay {
  date: string;       // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
  rainSum: number;
  windSpeedMax: number;
  weatherCode: number;
  description: string;
  icon: string;
  score: number;      // 0-100 suitability for outdoor travel
  hourly: WeatherHourly[];
}

// ─── Place context inference ──────────────────────────────────────────────────
// Suy luận bối cảnh điểm (indoor / độ nhạy mưa / điểm ăn / khung giờ lý tưởng) từ
// category & tags khi DB chưa có cột riêng. Ưu tiên field DB nếu đã có.

const INDOOR_CATEGORIES = new Set(['museum', 'market']); // ít bị ảnh hưởng mưa

// Độ nhạy thời tiết theo category (0 = trong nhà, 1 = rất nhạy mưa như biển/núi)
const WEATHER_SENSITIVE_BY_CATEGORY: Record<string, number> = {
  beach: 1, mountain: 0.9, viewpoint: 0.9, nature: 0.8, park: 0.7,
  historical: 0.5, temple: 0.5, entertainment: 0.3, food: 0.2,
  museum: 0.1, market: 0.2,
};

const MEAL_CATEGORIES = new Set(['food']);

// Tag gợi ý điểm trong nhà / ngoài trời (bổ trợ cho category)
const INDOOR_TAGS = new Set(['indoor', 'mall', 'cafe', 'trong nhà', 'bảo tàng']);
const OUTDOOR_TAGS = new Set(['outdoor', 'beach', 'hiking', 'ngoài trời', 'biển', 'leo núi']);

export interface PlaceContext {
  isIndoor: boolean;
  sensitivity: number; // 0..1
  isMealVenue: boolean;
  idealTimeOfDay: 'morning' | 'noon' | 'afternoon' | 'evening' | 'any';
}

export function derivePlaceContext(place: Partial<Place>): PlaceContext {
  const category = (place.category || '').toLowerCase();
  const tags = (place.tags || []).map((t) => t.toLowerCase());

  // isIndoor: ưu tiên field DB, rồi category, rồi tag
  let isIndoor = place.is_indoor;
  if (isIndoor === undefined) {
    isIndoor = INDOOR_CATEGORIES.has(category);
    if (tags.some((t) => INDOOR_TAGS.has(t))) isIndoor = true;
    if (tags.some((t) => OUTDOOR_TAGS.has(t))) isIndoor = false;
  }

  // sensitivity: ưu tiên field DB, rồi category (indoor override thấp)
  let sensitivity = place.weather_sensitivity;
  if (sensitivity === undefined) {
    sensitivity = WEATHER_SENSITIVE_BY_CATEGORY[category] ?? 0.5;
    if (isIndoor) sensitivity = Math.min(sensitivity, 0.15);
  }
  sensitivity = Math.max(0, Math.min(1, sensitivity));

  const isMealVenue = place.is_meal_venue ?? MEAL_CATEGORIES.has(category);

  // idealTimeOfDay: ưu tiên field DB, rồi best_time_of_day sẵn có
  let idealTimeOfDay = place.ideal_time_of_day;
  if (!idealTimeOfDay) {
    switch ((place.best_time_of_day || '').toLowerCase()) {
      case 'morning': idealTimeOfDay = 'morning'; break;
      case 'afternoon': idealTimeOfDay = 'afternoon'; break;
      case 'evening': idealTimeOfDay = 'evening'; break;
      default: idealTimeOfDay = 'any';
    }
  }

  return { isIndoor: !!isIndoor, sensitivity, isMealVenue, idealTimeOfDay };
}

// WMO Weather Interpretation Codes → human-readable
function interpretWeatherCode(code: number): { description: string; icon: string } {
  if (code === 0) return { description: 'Trời quang đãng', icon: '☀️' };
  if (code <= 3) return { description: 'Có mây', icon: '⛅' };
  if (code <= 48) return { description: 'Sương mù', icon: '🌫️' };
  if (code <= 57) return { description: 'Mưa phùn nhẹ', icon: '🌦️' };
  if (code <= 67) return { description: 'Có mưa', icon: '🌧️' };
  if (code <= 77) return { description: 'Tuyết (hiếm)', icon: '❄️' };
  if (code <= 82) return { description: 'Mưa rào', icon: '🌦️' };
  if (code <= 99) return { description: 'Giông bão', icon: '⛈️' };
  return { description: 'Không xác định', icon: '🌤️' };
}

// Calculate outdoor travel suitability score (0-100)
// sensitivity (0..1): mức độ hoạt động bị ảnh hưởng bởi mưa/gió/bão (1 = biển/núi).
// isIndoor: điểm trong nhà → gần như miễn nhiễm mưa/bão (× 0.1).
export function calculateWeatherScore(
  weatherCode: number,
  rain: number,
  windSpeed: number,
  temp: number,
  sensitivity: number = 1,
  isIndoor: boolean = false
): number {
  let score = 100;
  // Hệ số ảnh hưởng của thời tiết ngoài trời cho điểm này
  const exposure = Math.max(0, Math.min(1, sensitivity)) * (isIndoor ? 0.1 : 1);

  // Rain penalty
  let rainPenalty = 0;
  if (rain > 10) rainPenalty = 50;
  else if (rain > 5) rainPenalty = 30;
  else if (rain > 1) rainPenalty = 15;
  score -= rainPenalty * exposure;

  // Storm penalty
  let stormPenalty = 0;
  if (weatherCode >= 80) stormPenalty = 40;
  else if (weatherCode >= 60) stormPenalty = 25;
  else if (weatherCode >= 45) stormPenalty = 10;
  score -= stormPenalty * exposure;

  // Wind penalty
  let windPenalty = 0;
  if (windSpeed > 40) windPenalty = 20;
  else if (windSpeed > 25) windPenalty = 10;
  score -= windPenalty * exposure;

  // Temperature (áp dụng cho mọi loại điểm, không nhân exposure)
  if (temp > 38 || temp < 15) score -= 15;
  else if (temp > 35) score -= 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// Da Nang central coordinates (fallback)
const WEATHER_API_BASE_URL = process.env.EXPO_PUBLIC_WEATHER_API_URL
  || (process.env.NODE_ENV !== 'production' ? 'https://api.open-meteo.com' : '');

export async function fetchWeatherForecast(
  lat: number = DA_NANG_CENTER.latitude,
  lng: number = DA_NANG_CENTER.longitude,
  days: number = 7,
  startDate?: string
): Promise<WeatherDay[]> {
  if (!WEATHER_API_BASE_URL) throw new Error('Thiếu EXPO_PUBLIC_WEATHER_API_URL cho bản production');
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error('Tọa độ dự báo không hợp lệ');
  }
  const forecastDays = Math.max(1, Math.min(Math.floor(days), 16));
  const today = todayInTimeZone();
  const requestedStart = startDate || today;
  const startOffset = localDateDifference(today, requestedStart);
  const requestedEnd = addLocalDays(requestedStart, forecastDays - 1);
  const endOffset = localDateDifference(today, requestedEnd);
  if (startOffset < 0 || startOffset > 15 || endOffset > 15) return [];

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
    hourly: 'temperature_2m,precipitation,wind_speed_10m,weather_code',
    timezone: 'Asia/Ho_Chi_Minh',
    start_date: requestedStart,
    end_date: requestedEnd,
  });
  const url = `${WEATHER_API_BASE_URL}/v1/forecast?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
  if (!res.ok) throw new Error('Không thể tải dữ liệu thời tiết');
  const json = await res.json();

  const { daily, hourly } = json;
  if (!Array.isArray(daily?.time) || !Array.isArray(hourly?.time)) {
    throw new Error('Dữ liệu thời tiết không đúng định dạng');
  }

  const forecast: WeatherDay[] = daily.time.map((date: string, i: number) => {
    const weatherCode = daily.weather_code[i];
    const tempMax = Math.round(daily.temperature_2m_max[i]);
    const tempMin = Math.round(daily.temperature_2m_min[i]);
    const rainSum = daily.precipitation_sum[i] ?? 0;
    const windSpeedMax = daily.wind_speed_10m_max[i] ?? 0;
    const { description, icon } = interpretWeatherCode(weatherCode);
    const score = calculateWeatherScore(weatherCode, rainSum, windSpeedMax, (tempMax + tempMin) / 2);

    // Build hourly data for this day
    const dayHourly: WeatherHourly[] = [];
    for (let h = 6; h <= 22; h++) { // Show 6am-10pm
      const hourIndex = hourly.time.findIndex((value: string) => value === `${date}T${String(h).padStart(2, '0')}:00`);
      const temp = Math.round(hourly.temperature_2m[hourIndex] ?? 25);
      const rain = hourly.precipitation[hourIndex] ?? 0;
      const wind = hourly.wind_speed_10m[hourIndex] ?? 0;
      const hCode = hourly.weather_code[hourIndex] ?? 0;
      const { description: hDesc, icon: hIcon } = interpretWeatherCode(hCode);
      dayHourly.push({ hour: h, temp, rain, windSpeed: wind, weatherCode: hCode, description: hDesc, icon: hIcon });
    }

    return { date, tempMax, tempMin, rainSum, windSpeedMax, weatherCode, description, icon, score, hourly: dayHourly };
  });
  const expectedDates = Array.from({ length: forecastDays }, (_, index) => addLocalDays(requestedStart, index));
  if (forecast.length !== expectedDates.length || forecast.some((day, index) => day.date !== expectedDates[index])) {
    throw new Error('Dữ liệu thời tiết không khớp ngày của lịch trình.');
  }
  return forecast;
}

// Get best visiting time for a place based on weather
export function getBestVisitTime(
  hourly: WeatherHourly[],
  openingHour: number,
  closingHour: number,
  durationMin: number,
  sensitivity: number = 1,
  isIndoor: boolean = false
): { startHour: number; score: number } {
  let best = { startHour: openingHour, score: -1 };
  for (const h of hourly) {
    if (h.hour < openingHour || h.hour + durationMin / 60 > closingHour) continue;
    const score = calculateWeatherScore(h.weatherCode, h.rain, h.windSpeed, h.temp, sensitivity, isIndoor);
    if (score > best.score) {
      best = { startHour: h.hour, score };
    }
  }
  return best;
}

/**
 * scoreAtHour — chấm điểm thời tiết cho ĐÚNG GIỜ THỰC mà điểm được xếp thăm.
 * Đây là điểm mấu chốt sửa lỗi "hiển thị điểm giờ tốt nhất nhưng đến vào giờ khác".
 * hour có thể là số thập phân (vd 14.5) → chọn giờ gần nhất trong mảng hourly.
 */
export function scoreAtHour(
  hourly: WeatherHourly[],
  hour: number,
  sensitivity: number = 1,
  isIndoor: boolean = false
): number {
  const h = hourAt(hourly, hour);
  if (!h) return PLANNING_RULES.neutralWeatherScore;
  return calculateWeatherScore(h.weatherCode, h.rain, h.windSpeed, h.temp, sensitivity, isIndoor);
}

/** Lượng mưa (mm) tại giờ thực — dùng cho luật lời khuyên & cảnh báo mang ô. */
export function rainAtHour(hourly: WeatherHourly[], hour: number): number {
  return hourAt(hourly, hour)?.rain ?? 0;
}

/** Tìm bản ghi hourly gần giờ `hour` nhất (clamp vào [min, max]). */
function hourAt(hourly: WeatherHourly[], hour: number): WeatherHourly | undefined {
  if (!hourly || hourly.length === 0) return undefined;
  const target = Math.round(hour);
  let best = hourly[0];
  let bestDiff = Math.abs(best.hour - target);
  for (const h of hourly) {
    const diff = Math.abs(h.hour - target);
    if (diff < bestDiff) { best = h; bestDiff = diff; }
  }
  return best;
}

export interface GoldenWindow { startHour: number; endHour: number; avgScore: number }

/**
 * getGoldenWindows — các khung giờ liên tục có điểm ≥ threshold (mặc định 75)
 * để hiển thị "khung giờ vàng" (GĐ 4). Trả về theo thứ tự thời gian.
 */
export function getGoldenWindows(
  hourly: WeatherHourly[],
  sensitivity: number = 1,
  isIndoor: boolean = false,
  threshold: number = 75
): GoldenWindow[] {
  const windows: GoldenWindow[] = [];
  let runStart: number | null = null;
  let runScores: number[] = [];

  const flush = (endHour: number) => {
    if (runStart !== null && runScores.length > 0) {
      const avg = Math.round(runScores.reduce((a, b) => a + b, 0) / runScores.length);
      windows.push({ startHour: runStart, endHour, avgScore: avg });
    }
    runStart = null;
    runScores = [];
  };

  for (const h of hourly) {
    const s = calculateWeatherScore(h.weatherCode, h.rain, h.windSpeed, h.temp, sensitivity, isIndoor);
    if (s >= threshold) {
      if (runStart === null) runStart = h.hour;
      runScores.push(s);
    } else {
      flush(h.hour); // kết thúc trước giờ tụt điểm
    }
  }
  // Đóng khung cuối tới hết giờ dữ liệu (+1 để bao trọn giờ cuối)
  if (runStart !== null && hourly.length > 0) flush(hourly[hourly.length - 1].hour + 1);

  return windows;
}
