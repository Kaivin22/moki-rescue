import { Text, View } from 'react-native';
import { useI18n } from '@/src/i18n';
import type { RequestDetails } from '@/src/types/rescue';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

export function RescueQuoteCard({ quote }: { quote: NonNullable<RequestDetails['currentQuote']> }) {
  const c = useRescueDetailsCopy();
  const language = useI18n((state) => state.language);
  const status = {
    pending: c.quotePending,
    approved: c.quoteApproved,
    rejected: c.quoteRejected,
    superseded: c.quoteSuperseded,
  }[quote.status];
  return (
    <View style={styles.quoteCard}>
      <Text style={styles.section}>
        {c.quote} #{quote.version}
      </Text>
      <Text style={styles.quoteDescription}>{quote.description}</Text>
      <Text style={styles.quoteAmount}>
        {quote.amountVnd.toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} VND
      </Text>
      <Text style={styles.infoLabel}>
        {quote.workType === 'transport' ? c.transport : c.repair} • {status}
      </Text>
    </View>
  );
}
