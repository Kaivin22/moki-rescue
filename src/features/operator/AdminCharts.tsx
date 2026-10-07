import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import type { OperatorStatistics } from '@/src/types/rescue';
import { ChartSurface } from './ChartSurface';
import { pieDocument, statusSlices } from './statisticsCharts';

export function AdminCharts({ data, english }: { data: OperatorStatistics; english: boolean }) {
  const max = Math.max(1, ...data.daily.map((day) => day.count));
  const total = data.daily.reduce((sum, day) => sum + day.count, 0);
  const slices = statusSlices(data, english);
  const formatDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
  const today = data.daily.at(-1)?.count ?? 0;
  const yesterday = data.daily.at(-2)?.count ?? 0;
  const change = today - yesterday;
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>{english ? 'Requests over 7 days' : 'Yêu cầu trong 7 ngày'}</Text>
        <Text style={styles.caption}>
          {formatDate(data.fromDate)} – {formatDate(data.toDate)} ·{' '}
          {english ? 'Vietnam time (UTC+7)' : 'Giờ Việt Nam (UTC+7)'}
        </Text>
        <Text style={styles.total}>
          {total} {english ? 'requests' : 'yêu cầu'}
        </Text>
        <Text style={styles.caption}>
          {english ? 'Today vs. yesterday' : 'Hôm nay so với hôm qua'}: {change > 0 ? '+' : ''}
          {change} {english ? 'cases' : 'ca'}
        </Text>
        <View style={styles.plot}>
          <View style={styles.axis}>
            <Text style={styles.tick}>{max}</Text>
            <Text style={styles.tick}>0</Text>
          </View>
          <View style={styles.bars}>
            {data.daily.map((day) => (
              <View
                key={day.date}
                style={styles.column}
                accessible
                accessibilityLabel={`${formatDate(day.date)}: ${day.count}`}
              >
                <View style={styles.track}>
                  <Text style={styles.tick}>{day.count}</Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: (day.count / max) * 120,
                        backgroundColor: day.date === data.toDate ? Colors.primary : Colors.skyBlue,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.date}>{formatDate(day.date)}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.caption}>
          {english
            ? 'Counted by creation date. Today is not a full day yet.'
            : 'Đếm theo ngày tạo yêu cầu. Hôm nay chưa kết thúc nên số liệu còn thay đổi.'}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>{english ? 'Case status distribution' : 'Tỷ lệ trạng thái ca'}</Text>
        <Text style={styles.caption}>
          {english
            ? 'Current status of requests created in these 7 days.'
            : 'Trạng thái hiện tại của các yêu cầu được tạo trong 7 ngày trên.'}
        </Text>
        <ChartSurface
          html={pieDocument(slices)}
          label={english ? 'Case status pie chart' : 'Biểu đồ tròn trạng thái ca'}
        />
        {!total && (
          <Text style={styles.caption}>
            {english ? 'No requests in this period.' : 'Chưa có yêu cầu trong khoảng thời gian này.'}
          </Text>
        )}
        {slices.map((slice) => (
          <View style={styles.legend} key={slice.key}>
            <View style={[styles.dot, { backgroundColor: slice.color }]} />
            <Text style={[styles.caption, styles.flex]}>{slice.label}</Text>
            <Text style={styles.legendValue}>
              {slice.count} · {total ? ((slice.count / total) * 100).toFixed(1) : '0'}%
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}
const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm, borderRadius: Radius.lg, backgroundColor: Colors.cardBg },
  title: { ...Typography.bodyBold, color: Colors.textPrimary },
  caption: { ...Typography.caption, color: Colors.textSecondary },
  total: { ...Typography.h1, color: Colors.primary },
  plot: { height: 180, flexDirection: 'row', gap: 6 },
  axis: { width: 26, paddingTop: 18, paddingBottom: 24, justifyContent: 'space-between' },
  bars: { flex: 1, flexDirection: 'row', gap: 4 },
  column: { flex: 1, minWidth: 0 },
  track: {
    height: 154,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 5,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  bar: { width: '75%', maxWidth: 32, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  tick: { fontSize: 11, color: Colors.textSecondary },
  date: { fontSize: 10, textAlign: 'center', color: Colors.textSecondary, paddingTop: 5 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
  legendValue: { ...Typography.caption, color: Colors.textPrimary },
});
