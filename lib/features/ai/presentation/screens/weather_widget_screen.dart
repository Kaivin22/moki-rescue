import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/tokens/app_typography.dart';
import '../../../../core/theme/tokens/app_spacing.dart';
import '../../../../core/theme/tokens/app_borders.dart';
import '../providers/ai_providers.dart';
import '../../domain/services/weather_service.dart';

/// ═══════════════════════════════════════════════════════
/// SCREEN-42: WeatherWidgetScreen
/// 7-day forecast for Đà Nẵng & Hội An
/// Current: temperature, humidity, UV, wind
/// ═══════════════════════════════════════════════════════

class WeatherWidgetScreen extends ConsumerStatefulWidget {
  const WeatherWidgetScreen({super.key});

  @override
  ConsumerState<WeatherWidgetScreen> createState() =>
      _WeatherWidgetScreenState();
}

class _WeatherWidgetScreenState
    extends ConsumerState<WeatherWidgetScreen> {
  String _selectedCity = 'danang';

  static const _cities = [
    (id: 'danang', name: 'Đà Nẵng'),
    (id: 'hoian', name: 'Hội An'),
  ];


  @override
  Widget build(BuildContext context) {
    final weatherAsync = ref.watch(weatherProvider(_selectedCity));

    return weatherAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        body: Center(child: Text('Lỗi tải thời tiết: $e')),
      ),
      data: (weather) {
        final isHot = weather.temp >= 32;

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isHot
                ? [const Color(0xFFFF6B35), const Color(0xFFFFD93D)]
                : [const Color(0xFF023E8A), const Color(0xFF0096C7)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // ── AppBar ──
              Padding(
                padding: const EdgeInsets.all(AppSpacing.layoutSm),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                      onPressed: () => Navigator.maybePop(context),
                    ),
                    const Spacer(),
                    // City selector
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: _cities.map((c) {
                          final isActive = _selectedCity == c.id;
                          return GestureDetector(
                            onTap: () => setState(() => _selectedCity = c.id),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: isActive ? Colors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                c.name,
                                style: AppTextStyles.caption.copyWith(
                                  color: isActive ? (isHot ? const Color(0xFFFF6B35) : const Color(0xFF023E8A)) : Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.refresh_rounded, color: Colors.white),
                      onPressed: () => setState(() {}),
                    ),
                  ],
                ),
              ),

              // ── Current weather ──
              Expanded(
                flex: 3,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(weather.emoji, style: const TextStyle(fontSize: 80)),
                    const SizedBox(height: AppSpacing.space2),
                    Text(
                      '${weather.temp}°C',
                      style: AppTextStyles.display.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 64,
                      ),
                    ),
                    Text(
                      weather.condition,
                      style: AppTextStyles.h4.copyWith(color: Colors.white70),
                    ),
                    const SizedBox(height: AppSpacing.space1),
                    Text(
                      'Cảm giác ${weather.feelsLike}°C',
                      style: AppTextStyles.caption.copyWith(color: Colors.white60),
                    ),
                  ],
                ),
              ),

              // ── Detail stats ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.layoutMd),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StatChip(icon: '💧', label: 'Độ ẩm', value: '${weather.humidity}%'),
                    _StatChip(icon: '🌬', label: 'Gió', value: '${weather.windKph} km/h'),
                    _StatChip(icon: '☀', label: 'UV', value: '${weather.uvIndex}/10'),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.layoutSm),

              // ── 7-day forecast ──
              Container(
                margin: const EdgeInsets.all(AppSpacing.layoutSm),
                padding: const EdgeInsets.all(AppSpacing.space3),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: AppRadius.cardBorder,
                  border: Border.all(color: Colors.white30),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Dự báo 7 ngày',
                      style: AppTextStyles.caption.copyWith(color: Colors.white70, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: AppSpacing.space3),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: weather.forecast.map((f) => _DayChip(forecast: f)).toList(),
                    ),
                  ],
                ),
              ),

              // ── Travel tip ──
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.layoutSm, 0, AppSpacing.layoutSm, AppSpacing.layoutSm),
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.space3),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: AppRadius.cardBorder,
                  ),
                  child: Row(
                    children: [
                      const Text('💡', style: TextStyle(fontSize: 20)),
                      const SizedBox(width: AppSpacing.space2),
                      Expanded(
                        child: Text(
                          isHot
                              ? 'Nắng nóng: Mang kem chống nắng SPF50+, uống nhiều nước, tránh ra ngoài 11h-14h.'
                              : 'Thời tiết dễ chịu: Lý tưởng để tham quan. Mang áo khoác nhẹ cho buổi tối.',
                          style: AppTextStyles.caption.copyWith(color: Colors.white, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
      },
    );
  }
}

// Domain models moved to weather_service.dart


class _StatChip extends StatelessWidget {
  const _StatChip({required this.icon, required this.label, required this.value});
  final String icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.space3, vertical: AppSpacing.space2),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.2),
          borderRadius: AppRadius.cardBorder,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(icon, style: const TextStyle(fontSize: 20)),
            const SizedBox(height: 4),
            Text(value, style: AppTextStyles.bodyMd.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
            Text(label, style: AppTextStyles.caption.copyWith(color: Colors.white70)),
          ],
        ),
      );
}

class _DayChip extends StatelessWidget {
  const _DayChip({required this.forecast});
  final DayForecast forecast;

  @override
  Widget build(BuildContext context) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(forecast.day, style: AppTextStyles.caption.copyWith(color: Colors.white70)),
          const SizedBox(height: 4),
          Text(forecast.emoji, style: const TextStyle(fontSize: 18)),
          const SizedBox(height: 4),
          Text('${forecast.high}°', style: AppTextStyles.caption.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
          Text('${forecast.low}°', style: AppTextStyles.caption.copyWith(color: Colors.white60)),
        ],
      );
}
