import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/constants/colors';
import { useCopy } from '@/src/i18n';
import type { RequestDetails } from '@/src/types/rescue';
import { navigationDestination } from '../services/navigation';

const COPY = {
  vi: {
    pickup: 'Google Maps sẽ đến điểm cứu hộ',
    dropoff: 'Google Maps sẽ đến điểm giao xe',
    origin:
      'Điểm xuất phát là GPS điện thoại trong Google Maps; có thể khác vị trí cứu hộ viên đã lưu lúc nhận ca.',
    invalid: 'Tọa độ đích không hợp lệ. Chưa thể dẫn đường.',
  },
  en: {
    pickup: 'Google Maps destination: rescue pickup',
    dropoff: 'Google Maps destination: motorcycle drop-off',
    origin:
      'Google Maps starts at the phone’s current GPS location, which may differ from the saved assignment location.',
    invalid: 'Invalid destination coordinates. Navigation is unavailable.',
  },
};

export function NavigationTarget({ request }: { request: RequestDetails }) {
  const c = useCopy(COPY);
  let point;
  try {
    point = navigationDestination(request);
  } catch {
    return <Text style={styles.text}>{c.invalid}</Text>;
  }
  const dropoff =
    request.activeWorkType === 'transport' &&
    ['transporting', 'awaiting_completion'].includes(request.status);
  return (
    <View>
      <Text style={styles.text}>
        {dropoff ? c.dropoff : c.pickup}: {dropoff ? request.destinationAreaLabel : request.pickupAreaLabel}
      </Text>
      <Text selectable style={styles.text}>
        {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
      </Text>
      <Text style={styles.text}>{c.origin}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ text: { fontSize: 12, color: Colors.textSecondary } });
