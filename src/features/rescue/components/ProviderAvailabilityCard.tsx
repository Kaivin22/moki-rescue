import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { Radius, Spacing, Typography } from '@/src/constants/spacing';
import type { ProviderStatus } from '@/src/types/rescue';
import { rescueApi } from '../api/rescueApi';
import { ApiClientError } from '../api/client';
import { RatingBadge } from './RatingBadge';

type Mode = 'shop' | 'current';
type Props = {
  status?: ProviderStatus;
  teamLabel: string;
  ratingLabel: string;
  canChange: boolean;
  english: boolean;
  save: typeof rescueApi.setAvailability;
};

export function ProviderAvailabilityCard({
  status,
  teamLabel,
  ratingLabel,
  canChange,
  english,
  save,
}: Props) {
  const [draft, setDraft] = useState<Mode | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const available = status?.available ?? false;
  const expiry = status?.departureExpiresAt;
  const mode = (!available && draft) || (expiry ? 'current' : 'shop');
  const title = english ? 'Available for requests' : 'Sẵn sàng nhận ca';
  const labels = {
    shop: english ? 'Shop' : 'Cửa hàng',
    current: english ? 'Current location' : 'Vị trí hiện tại',
  };
  const disabled = !canChange || busy;

  async function change(nextAvailable: boolean, nextMode: Mode) {
    if (disabled || locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (nextAvailable && nextMode === 'current') {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!mounted.current) return;
        if (!permission.granted) {
          setMessage(
            english
              ? 'Allow location access or choose your shop.'
              : 'Hãy cho phép lấy vị trí hoặc chọn cửa hàng.',
          );
          return;
        }
        // Expo Web accepts browser position options and otherwise reuses a fix indefinitely.
        const options = { accuracy: Location.Accuracy.High, maximumAge: 0, timeout: 15000 };
        const fix = await Location.getCurrentPositionAsync(options);
        if (!mounted.current) return;
        if (fix.coords.accuracy == null || !Number.isFinite(fix.timestamp)) {
          setMessage(
            english
              ? 'Could not get an accurate fix. Try again.'
              : 'Chưa lấy được vị trí đủ chính xác. Hãy thử lại.',
          );
          return;
        }
        await save({
          available: true,
          departureMode: 'current',
          latitude: fix.coords.latitude,
          longitude: fix.coords.longitude,
          accuracyM: fix.coords.accuracy,
          recordedAt: new Date(fix.timestamp).toISOString(),
        });
      } else {
        await save({ available: nextAvailable, departureMode: 'shop' });
      }
      if (mounted.current) {
        setDraft(null);
        setEditing(false);
      }
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof ApiClientError
            ? error.message
            : english
              ? 'Could not update readiness. Try again.'
              : 'Chưa cập nhật được trạng thái. Hãy thử lại.',
        );
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  function choose(value: Mode) {
    if (available && value !== mode) {
      void change(true, value);
      return;
    }
    setDraft(value);
    setMessage('');
    setEditing(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.note}>{teamLabel}</Text>
          {status && <RatingBadge rating={status.teamRating} label={ratingLabel} compact />}
        </View>
        <Switch
          accessibilityLabel={title}
          value={available}
          disabled={disabled}
          onValueChange={(value) => void change(value, mode)}
          trackColor={{ false: Colors.borderStrong, true: Colors.success }}
          thumbColor={Colors.white}
        />
      </View>
      {status && 'departureExpiresAt' in status && (
        <>
          <View style={styles.row}>
            <Text style={styles.flex}>
              {english ? 'Depart from' : 'Xuất phát từ'}: {labels[mode]}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={english ? 'Change departure point' : 'Đổi điểm xuất phát'}
              accessibilityState={{ expanded: editing, disabled }}
              disabled={disabled}
              style={styles.action}
              onPress={() => setEditing(!editing)}
            >
              <Text style={styles.link}>
                {editing ? (english ? 'Close' : 'Đóng') : english ? 'Change' : 'Đổi'}
              </Text>
            </Pressable>
          </View>
          {editing && (
            <View accessibilityRole="radiogroup">
              {(['shop', 'current'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={labels[value]}
                  accessibilityState={{ checked: value === mode, disabled }}
                  disabled={disabled}
                  style={styles.option}
                  onPress={() => choose(value)}
                >
                  <Text style={value === mode ? styles.link : styles.note}>{labels[value]}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {mode === 'current' && available && expiry && (
            <View style={styles.row}>
              <Text style={[styles.note, styles.flex]}>
                {english ? 'GPS valid until' : 'GPS có hiệu lực đến'}{' '}
                {new Date(expiry).toLocaleTimeString(english ? 'en-GB' : 'vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={english ? 'Refresh location' : 'Cập nhật vị trí'}
                disabled={disabled}
                style={styles.action}
                onPress={() => void change(true, 'current')}
              >
                <Text style={styles.link}>{english ? 'Refresh location' : 'Cập nhật vị trí'}</Text>
              </Pressable>
            </View>
          )}
          {mode === 'current' && !available && (
            <Text style={styles.note}>
              {expiry
                ? english
                  ? 'Readiness paused. Get a new location when you turn it back on.'
                  : 'Đã tạm dừng nhận ca. Bật sẵn sàng để lấy vị trí mới.'
                : english
                  ? 'When ready, share one GPS fix as your departure point.'
                  : 'Khi bật sẵn sàng, app lấy GPS một lần làm điểm xuất phát.'}
            </Text>
          )}
        </>
      )}
      {busy && (
        <Text accessibilityLiveRegion="polite" style={styles.note}>
          {english ? 'Updating…' : 'Đang cập nhật…'}
        </Text>
      )}
      {message && (
        <Text accessibilityRole="alert" style={styles.error}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  flex: { flex: 1 },
  title: { ...Typography.bodyBold, color: Colors.textPrimary },
  note: { ...Typography.caption, color: Colors.textSecondary },
  error: { ...Typography.caption, color: Colors.error },
  action: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  link: { ...Typography.bodyBold, color: Colors.primary },
});
