import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { WeatherDay } from '@/src/services/weatherService';
import { GoldenWindow, formatDateVi } from '@/src/features/itinerary/services/routeOptimizer';

interface WeatherTimelineProps {
  day: WeatherDay;
  dayNumber: number;
  date?: string;
  goldenWindows?: GoldenWindow[];
  /** Chạm vào một giờ → nhảy tới slot tương ứng ở tab Lịch trình */
  onSelectHour?: (hour: number) => void;
}

const MAX_BAR_HEIGHT = 64;

/**
 * WeatherTimeline — dự báo theo giờ cho một ngày:
 *  - bar chart mm mưa/giờ (đỏ khi >2mm)
 *  - dải nhiệt độ min–max
 *  - tô "khung giờ vàng" (≥75đ) dưới trục
 */
export function WeatherTimeline({
  day, dayNumber, date, goldenWindows, onSelectHour,
}: WeatherTimelineProps) {
  const hours = day.hourly;
  const maxRain = Math.max(1, ...hours.map((h) => h.rain));

  const isGolden = (hour: number) =>
    (goldenWindows || []).some((g) => hour >= g.startHour && hour < g.endHour);

  return (
    <View style={styles.container}>
      {/* Header ngày */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dayTitle}>
            Ngày {dayNumber}{date ? ` · ${formatDateVi(date)}` : ''}
          </Text>
          <Text style={styles.daySub}>
            {day.icon} {day.description} · {day.tempMin}–{day.tempMax}°C
          </Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scorePillText}>Điểm ngày {day.score}</Text>
        </View>
      </View>

      {/* Bar chart mm mưa/giờ */}
      <Text style={styles.axisLabel}>Lượng mưa theo giờ (mm)</Text>
      <View style={styles.chart}>
        {hours.map((h) => {
          const barH = Math.max(3, (h.rain / maxRain) * MAX_BAR_HEIGHT);
          const rainy = h.rain > 2;
          const golden = isGolden(h.hour);
          return (
            <TouchableOpacity
              key={h.hour}
              style={styles.barCol}
              activeOpacity={onSelectHour ? 0.6 : 1}
              onPress={onSelectHour ? () => onSelectHour(h.hour) : undefined}
            >
              <View style={styles.barTrack}>
                {golden && <View style={styles.goldenBg} />}
                <View
                  style={[
                    styles.bar,
                    { height: barH, backgroundColor: rainy ? Colors.error : Colors.info },
                  ]}
                />
              </View>
              {h.hour % 2 === 0 && <Text style={styles.hourLabel}>{h.hour}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dải nhiệt độ */}
      <View style={styles.tempRow}>
        {hours.map((h) => (
          h.hour % 2 === 0 ? (
            <Text key={h.hour} style={styles.tempLabel}>{h.temp}°</Text>
          ) : <View key={h.hour} style={{ flex: 1 }} />
        ))}
      </View>

      {/* Chú giải khung giờ vàng */}
      {goldenWindows && goldenWindows.length > 0 && (
        <View style={styles.goldenLegend}>
          <View style={styles.goldenSwatch} />
          <Text style={styles.goldenText}>
            Khung giờ vàng:{' '}
            {goldenWindows
              .map((g) => `${pad(g.startHour)}:00–${pad(g.endHour)}:00`)
              .join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
}

function pad(h: number): string {
  return String(Math.round(h)).padStart(2, '0');
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  dayTitle: { ...Typography.h3, color: Colors.primary },
  daySub: { ...Typography.caption, color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  scorePill: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  scorePillText: { ...Typography.caption, color: Colors.textOnAccent, fontWeight: '700', fontSize: 11 },
  axisLabel: { ...Typography.caption, color: Colors.secondary, fontSize: 11, marginBottom: 4 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: MAX_BAR_HEIGHT + 18,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    height: MAX_BAR_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  goldenBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.accent + '2A',
  },
  bar: {
    width: '58%',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  hourLabel: { ...Typography.caption, color: Colors.textMuted, fontSize: 9, marginTop: 2 },
  tempRow: { flexDirection: 'row', marginTop: 2 },
  tempLabel: { ...Typography.caption, color: Colors.textSecondary, fontSize: 9, flex: 2, textAlign: 'center' },
  goldenLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: Colors.accent + '18',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  goldenSwatch: {
    width: 14, height: 14, borderRadius: 3,
    backgroundColor: Colors.accent + '55',
  },
  goldenText: { ...Typography.caption, color: Colors.textSecondary, fontSize: 11, flex: 1 },
});
