import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Colors } from '@/src/constants/colors';
import { Spacing } from '@/src/constants/spacing';

export interface ChartItem {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({ slices, size = 160, strokeWidth = 28 }: {
  slices: ChartItem[];
  size?: number;
  strokeWidth?: number;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={radius} stroke={Colors.mist} strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <Text style={{ position: 'absolute', color: Colors.textMuted, fontSize: 12 }}>Chưa có dữ liệu</Text>
      </View>
    );
  }

  let offset = 0;
  const segments = slices.map(slice => {
    const dash = (slice.value / total) * circumference;
    const segment = { ...slice, dash, gap: circumference - dash, offset };
    offset += dash;
    return segment;
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={Colors.mist} strokeWidth={strokeWidth} fill="none" />
        {segments.map(segment => (
          <Circle key={segment.label} cx={center} cy={center} r={radius} stroke={segment.color}
            strokeWidth={strokeWidth} fill="none" strokeDasharray={`${segment.dash} ${segment.gap}`}
            strokeDashoffset={circumference / 4 - segment.offset} strokeLinecap="round" />
        ))}
        <SvgText x={center} y={center - 8} textAnchor="middle" fill={Colors.textPrimary} fontSize="22" fontWeight="bold">{total}</SvgText>
        <SvgText x={center} y={center + 12} textAnchor="middle" fill={Colors.textMuted} fontSize="11">Tổng cộng</SvgText>
      </Svg>
    </View>
  );
}

export function BarChart({ bars, height = 120 }: { bars: ChartItem[]; height?: number }) {
  const chartWidth = Dimensions.get('window').width - 80;
  const max = Math.max(...bars.map(bar => bar.value), 1);
  const barWidth = Math.min(40, chartWidth / bars.length - 12);
  return (
    <Svg width={chartWidth} height={height + 36}>
      {[0, 0.5, 1].map(position => (
        <Line key={position} x1="0" y1={height - position * height} x2={chartWidth}
          y2={height - position * height} stroke={Colors.mist} strokeWidth="1" strokeDasharray="4,4" />
      ))}
      {bars.map((bar, index) => {
        const barHeight = (bar.value / max) * height;
        const x = (index / bars.length) * chartWidth + (chartWidth / bars.length - barWidth) / 2;
        const y = height - barHeight;
        return (
          <G key={bar.label}>
            <Rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 4)} rx="6" ry="6" fill={bar.color} opacity={0.9} />
            <SvgText x={x + barWidth / 2} y={y - 4} textAnchor="middle" fill={Colors.textPrimary} fontSize="10" fontWeight="bold">{bar.value}</SvgText>
            <SvgText x={x + barWidth / 2} y={height + 16} textAnchor="middle" fill={Colors.textSecondary} fontSize="9">{bar.label}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export function ChartLegend({ items }: { items: ChartItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <View style={{ marginTop: Spacing.sm, gap: 6 }}>
      {items.map(item => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
          <Text style={{ flex: 1, fontSize: 12, color: Colors.textSecondary }}>{item.label}</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textPrimary }}>{item.value}</Text>
          <Text style={{ fontSize: 10, color: Colors.textMuted, width: 36, textAlign: 'right' }}>
            {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
          </Text>
        </View>
      ))}
    </View>
  );
}
