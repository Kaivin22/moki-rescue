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
function calculateWeatherScore(weatherCode: number, rain: number, windSpeed: number, temp: number): number {
  let score = 100;
  // Rain penalty
  if (rain > 10) score -= 50;
  else if (rain > 5) score -= 30;
  else if (rain > 1) score -= 15;
  // Storm penalty
  if (weatherCode >= 80) score -= 40;
  else if (weatherCode >= 60) score -= 25;
  else if (weatherCode >= 45) score -= 10;
  // Wind penalty
  if (windSpeed > 40) score -= 20;
  else if (windSpeed > 25) score -= 10;
  // Temperature
  if (temp > 38 || temp < 15) score -= 15;
  else if (temp > 35) score -= 8;
  return Math.max(0, Math.min(100, score));
}

// Da Nang central coordinates (fallback)
const DA_NANG_LAT = 16.0544;
const DA_NANG_LNG = 108.2022;

export async function fetchWeatherForecast(
  lat: number = DA_NANG_LAT,
  lng: number = DA_NANG_LNG,
  days: number = 7
): Promise<WeatherDay[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&hourly=temperature_2m,precipitation,windspeed_10m,weathercode&timezone=Asia%2FBangkok&forecast_days=${Math.min(days, 16)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Không thể tải dữ liệu thời tiết');
  const json = await res.json();

  const { daily, hourly } = json;

  return daily.time.map((date: string, i: number) => {
    const weatherCode = daily.weathercode[i];
    const tempMax = Math.round(daily.temperature_2m_max[i]);
    const tempMin = Math.round(daily.temperature_2m_min[i]);
    const rainSum = daily.precipitation_sum[i] ?? 0;
    const windSpeedMax = daily.windspeed_10m_max[i] ?? 0;
    const { description, icon } = interpretWeatherCode(weatherCode);
    const score = calculateWeatherScore(weatherCode, rainSum, windSpeedMax, (tempMax + tempMin) / 2);

    // Build hourly data for this day
    const dayHourly: WeatherHourly[] = [];
    for (let h = 6; h <= 22; h++) { // Show 6am-10pm
      const hourIndex = i * 24 + h;
      const temp = Math.round(hourly.temperature_2m[hourIndex] ?? 25);
      const rain = hourly.precipitation[hourIndex] ?? 0;
      const wind = hourly.windspeed_10m[hourIndex] ?? 0;
      const hCode = hourly.weathercode[hourIndex] ?? 0;
      const { description: hDesc, icon: hIcon } = interpretWeatherCode(hCode);
      dayHourly.push({ hour: h, temp, rain, windSpeed: wind, weatherCode: hCode, description: hDesc, icon: hIcon });
    }

    return { date, tempMax, tempMin, rainSum, windSpeedMax, weatherCode, description, icon, score, hourly: dayHourly };
  });
}

// Get best visiting time for a place based on weather
export function getBestVisitTime(
  hourly: WeatherHourly[],
  openingHour: number,
  closingHour: number,
  durationMin: number
): { startHour: number; score: number } {
  let best = { startHour: openingHour, score: -1 };
  for (const h of hourly) {
    if (h.hour < openingHour || h.hour + durationMin / 60 > closingHour) continue;
    const score = calculateWeatherScore(h.weatherCode, h.rain, h.windSpeed, h.temp);
    if (score > best.score) {
      best = { startHour: h.hour, score };
    }
  }
  return best;
}
