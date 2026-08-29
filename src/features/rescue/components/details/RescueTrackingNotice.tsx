import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { Colors } from '@/src/constants/colors';
import type { ProviderTrackingState } from '@/src/features/rescue/hooks/useProviderTracking';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

export function RescueTrackingNotice({ state }: { state: ProviderTrackingState }) {
  const c = useRescueDetailsCopy();
  return (
    <View style={styles.tracking}>
      <Ionicons
        name="navigate-circle-outline"
        size={21}
        color={state === 'tracking' ? Colors.success : Colors.warning}
      />
      <Text style={styles.trackingText}>
        {c.tracking[state]} {c.expoTracking}
      </Text>
    </View>
  );
}
