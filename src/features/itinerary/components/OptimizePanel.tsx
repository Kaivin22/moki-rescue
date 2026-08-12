import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import { AppButton } from '@/src/components/atoms/AppButton';
import { OptimizerResult, OptimizerWeights } from '@/src/features/itinerary/services/routeOptimizer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface OptimizeMetrics {
  distanceKm: number;
  weatherScore: number;   // trung bình các ngày (0..100)
  totalTimeMin: number;
}

interface OptimizePanelProps {
  visible: boolean;
  weights: OptimizerWeights;
  onChangeWeights: (w: OptimizerWeights) => void;
  before?: OptimizeMetrics;   // hiện trạng (chưa tối ưu)
  after?: OptimizeMetrics;    // dự kiến sau tối ưu (preview)
  routingStatus?: OptimizerResult['routingStatus'];
  loading?: boolean;
  onPreview: () => void;
  onApply: () => void;
  onClose: () => void;
}

// Thanh trọng số rời rạc 0..3 (dependency-free thay cho native slider)
const STEPS = 4; // mức 0,1,2,3

function WeightRow({
  label, icon, value, onChange,
}: { label: string; icon: string; value: number; onChange: (v: number) => void }) {
  const level = Math.round(value); // 0..3
  return (
    <View style={styles.weightRow}>
      <Text style={styles.weightLabel}>{icon} {label}</Text>
      <View style={styles.stepBar}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.stepDot, i <= level && styles.stepDotActive]}
            onPress={() => onChange(i)}
          />
        ))}
      </View>
    </View>
  );
}

function DeltaRow({
  icon, label, before, after, unit, higherIsBetter,
}: {
  icon: string; label: string; before?: number; after?: number; unit: string; higherIsBetter: boolean;
}) {
  const has = before !== undefined && after !== undefined;
  let improved: boolean | null = null;
  let deltaStr = '';
  if (has) {
    const diff = after! - before!;
    improved = higherIsBetter ? diff > 0 : diff < 0;
    const sign = diff > 0 ? '+' : '';
    deltaStr = `${sign}${Math.round(diff)}${unit}`;
  }
  return (
    <View style={styles.deltaRow}>
      <Text style={styles.deltaLabel}>{icon} {label}</Text>
      {has ? (
        <View style={styles.deltaValues}>
          <Text style={styles.deltaBefore}>{Math.round(before!)}{unit}</Text>
          <Ionicons name="arrow-forward" size={12} color={Colors.textMuted} />
          <Text style={styles.deltaAfter}>{Math.round(after!)}{unit}</Text>
          {improved !== null && (
            <Text style={[styles.deltaBadge, { color: improved ? Colors.success : Colors.error }]}>
              {deltaStr} {improved ? '✅' : ''}
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.deltaPending}>Nhấn “Xem trước”</Text>
      )}
    </View>
  );
}

/**
 * OptimizePanel — "bảng điều khiển tối ưu" thay cho hộp đen.
 * Cho chỉnh trọng số + so sánh trước/sau; áp dụng vẫn cho chỉnh tay tiếp.
 */
export function OptimizePanel({
  visible, weights, onChangeWeights, before, after, routingStatus, loading,
  onPreview, onApply, onClose,
}: OptimizePanelProps) {
  const insets = useSafeAreaInsets();
  const set = (k: keyof OptimizerWeights, v: number) =>
    onChangeWeights({ ...weights, [k]: v });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>⚡ Tối ưu thông minh</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Ưu tiên của bạn</Text>
            <WeightRow label="Tránh mưa" icon="☔" value={weights.weather} onChange={(v) => set('weather', v)} />
            <WeightRow label="Giảm thời gian di chuyển" icon="🚗" value={weights.travel} onChange={(v) => set('travel', v)} />
            <WeightRow label="Giờ đẹp / điểm" icon="🕑" value={weights.ideal} onChange={(v) => set('ideal', v)} />

            <Text style={styles.sectionLabel}>Kết quả dự kiến</Text>
            {routingStatus ? (
              <View style={[styles.routingNotice, routingStatus !== 'road' && routingStatus !== 'not_needed' && styles.routingNoticeWarning]}>
                <Ionicons
                  name={routingStatus === 'road' ? 'navigate-circle' : 'information-circle-outline'}
                  size={18}
                  color={routingStatus === 'road' ? Colors.success : Colors.warning}
                />
                <Text style={styles.routingNoticeText}>
                  {routingStatus === 'road'
                    ? 'Phân ngày và tính chặng bằng mạng lưới đường cho phương tiện đã chọn.'
                    : routingStatus === 'mixed'
                      ? 'Một phần phép tính phải dùng ước tính; hãy kiểm tra lại tuyến trên bản đồ trước khi đi.'
                      : routingStatus === 'not_needed'
                        ? 'Không có chặng giữa hai địa điểm để tối ưu.'
                        : 'Chưa có dữ liệu đường bộ cho phương tiện này; kết quả hiện chỉ là ước tính.'}
                </Text>
              </View>
            ) : null}
            <DeltaRow icon="🧭" label="Quãng đường" before={before?.distanceKm} after={after?.distanceKm} unit="km" higherIsBetter={false} />
            <DeltaRow icon="☀️" label="Điểm thời tiết" before={before?.weatherScore} after={after?.weatherScore} unit="đ" higherIsBetter={true} />
            <DeltaRow icon="⏱️" label="Tổng thời gian" before={before?.totalTimeMin} after={after?.totalTimeMin} unit="p" higherIsBetter={false} />
          </ScrollView>

          <View style={styles.footer}>
            <AppButton
              title="Xem trước"
              variant="outline"
              onPress={onPreview}
              loading={loading}
              fullWidth={false}
              style={{ flex: 1 }}
            />
            <AppButton
              title="Áp dụng tối ưu"
              onPress={onApply}
              disabled={!after}
              fullWidth={false}
              style={{ flex: 1.4 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.divider,
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: { ...Typography.h2, color: Colors.primary },
  sectionLabel: {
    ...Typography.label, color: Colors.textSecondary,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  weightRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  weightLabel: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  stepBar: { flexDirection: 'row', gap: 6 },
  stepDot: {
    width: 26, height: 10, borderRadius: 5,
    backgroundColor: Colors.divider,
  },
  stepDotActive: { backgroundColor: Colors.primary },
  deltaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.cardBg, borderRadius: Radius.md,
    padding: Spacing.sm, marginBottom: Spacing.xs,
    borderWidth: 1, borderColor: Colors.divider,
  },
  deltaLabel: { ...Typography.caption, color: Colors.textSecondary, fontSize: 13 },
  deltaValues: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deltaBefore: { ...Typography.caption, color: Colors.textMuted, textDecorationLine: 'line-through', fontSize: 12 },
  deltaAfter: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 13 },
  deltaBadge: { ...Typography.caption, fontWeight: '700', fontSize: 12, marginLeft: 4 },
  deltaPending: { ...Typography.caption, color: Colors.textMuted, fontStyle: 'italic', fontSize: 12 },
  routingNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.success,
    backgroundColor: '#EFFAF4', padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  routingNoticeWarning: { borderColor: Colors.warning, backgroundColor: '#FFF9E6' },
  routingNoticeText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 17 },
  footer: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
});
