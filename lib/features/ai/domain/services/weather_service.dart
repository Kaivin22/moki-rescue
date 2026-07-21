// ═══════════════════════════════════════════════════════
// WeatherService — Static weather data for Đà Nẵng & Hội An
// Future: replace with OpenWeatherMap API
// ═══════════════════════════════════════════════════════

class WeatherService {
  const WeatherService();

  /// Fetch weather for a city (static mock for MVP)
  Future<CityWeather> getWeather(String cityId) async {
    await Future.delayed(const Duration(milliseconds: 300));
    return _data[cityId] ?? _data['danang']!;
  }

  static final _data = {
    'danang': CityWeather(
      city: 'Đà Nẵng',
      temp: 33,
      feelsLike: 36,
      humidity: 72,
      windKph: 18,
      uvIndex: 8,
      condition: 'Nắng',
      emoji: '☀️',
      forecast: [
        DayForecast(day: 'Hôm nay', high: 33, low: 27, emoji: '☀️'),
        DayForecast(day: 'T3', high: 31, low: 26, emoji: '⛅'),
        DayForecast(day: 'T4', high: 28, low: 25, emoji: '🌧'),
        DayForecast(day: 'T5', high: 27, low: 24, emoji: '🌧'),
        DayForecast(day: 'T6', high: 30, low: 25, emoji: '⛅'),
        DayForecast(day: 'T7', high: 32, low: 26, emoji: '☀️'),
        DayForecast(day: 'CN', high: 34, low: 27, emoji: '☀️'),
      ],
    ),
    'hoian': CityWeather(
      city: 'Hội An',
      temp: 31,
      feelsLike: 34,
      humidity: 75,
      windKph: 14,
      uvIndex: 7,
      condition: 'Có mây',
      emoji: '⛅',
      forecast: [
        DayForecast(day: 'Hôm nay', high: 31, low: 25, emoji: '⛅'),
        DayForecast(day: 'T3', high: 30, low: 24, emoji: '⛅'),
        DayForecast(day: 'T4', high: 27, low: 24, emoji: '🌦'),
        DayForecast(day: 'T5', high: 26, low: 23, emoji: '🌧'),
        DayForecast(day: 'T6', high: 29, low: 24, emoji: '⛅'),
        DayForecast(day: 'T7', high: 31, low: 25, emoji: '☀️'),
        DayForecast(day: 'CN', high: 33, low: 26, emoji: '☀️'),
      ],
    ),
  };
}

class CityWeather {
  const CityWeather({
    required this.city,
    required this.temp,
    required this.feelsLike,
    required this.humidity,
    required this.windKph,
    required this.uvIndex,
    required this.condition,
    required this.emoji,
    required this.forecast,
  });

  final String city;
  final int temp;
  final int feelsLike;
  final int humidity;
  final int windKph;
  final int uvIndex;
  final String condition;
  final String emoji;
  final List<DayForecast> forecast;
}

class DayForecast {
  const DayForecast({
    required this.day,
    required this.high,
    required this.low,
    required this.emoji,
  });

  final String day;
  final int high;
  final int low;
  final String emoji;
}
