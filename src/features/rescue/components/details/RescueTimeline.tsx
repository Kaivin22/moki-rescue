import { Text, View } from 'react-native';
import { statusLabel } from '@/src/features/rescue/status';
import { useI18n } from '@/src/i18n';
import type { RequestDetails } from '@/src/types/rescue';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

export function RescueTimeline({ events }: { events: RequestDetails['events'] }) {
  const c = useRescueDetailsCopy();
  const language = useI18n((state) => state.language);
  return (
    <>
      <Text style={styles.section}>{c.progress}</Text>
      <View style={styles.timeline}>
        {events.map((event, index) => (
          <View key={`${event.createdAt}-${index}`} style={styles.event}>
            <View style={styles.eventRail}>
              <View style={styles.eventDot} />
              {index < events.length - 1 ? <View style={styles.eventLine} /> : null}
            </View>
            <View style={styles.eventBody}>
              <Text style={styles.eventTitle}>{statusLabel(event.toStatus, language)}</Text>
              <Text style={styles.eventTime}>
                {new Date(event.createdAt).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}
