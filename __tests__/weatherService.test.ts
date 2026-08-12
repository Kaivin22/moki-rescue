import { calculateWeatherScore, fetchWeatherForecast, getBestVisitTime } from '../src/services/weatherService';

describe('weather service rules', () => {
  it('penalizes an exposed outdoor place more than an indoor place', () => {
    const outdoor = calculateWeatherScore(95, 12, 45, 29, 1, false);
    const indoor = calculateWeatherScore(95, 12, 45, 29, 1, true);
    expect(indoor).toBeGreaterThan(outdoor);
  });

  it('selects the best feasible visiting hour', () => {
    const hourly = [
      { hour: 8, temp: 28, rain: 8, windSpeed: 10, weatherCode: 63, description: '', icon: '' },
      { hour: 9, temp: 28, rain: 0, windSpeed: 8, weatherCode: 1, description: '', icon: '' },
    ];
    expect(getBestVisitTime(hourly, 8, 11, 60).startHour).toBe(9);
  });

  it('rejects invalid coordinates before making a request', async () => {
    await expect(fetchWeatherForecast(120, 108, 1)).rejects.toThrow('Tọa độ');
  });
});
