import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { AppButton } from '@/src/components/atoms/AppButton';
import { AppInput } from '@/src/components/atoms/AppInput';
import { Colors } from '@/src/constants/colors';
import { ApiClientError } from '@/src/features/rescue/api/client';
import { useReviewActions } from '@/src/features/rescue/hooks/useRescueActions';
import type { RequestDetails } from '@/src/types/rescue';
import { useRescueDetailsCopy } from './rescueDetailsCopy';
import { rescueDetailsStyles as styles } from './rescueDetailsStyles';

export function ReviewPanel({ request }: { request: RequestDetails }) {
  const actions = useReviewActions(request.id);
  const c = useRescueDetailsCopy();
  const [rating, setRating] = useState(request.review?.rating ?? 5);
  const [comment, setComment] = useState(request.review?.comment ?? '');
  const save = async () => {
    try {
      await actions.save.mutateAsync({ rating, comment: comment.trim() || undefined });
    } catch (error) {
      Alert.alert(c.saveReviewError, error instanceof ApiClientError ? error.message : c.retryGeneric);
    }
  };
  const remove = () =>
    Alert.alert(c.deleteReviewTitle, c.deleteReviewBody, [
      { text: c.no, style: 'cancel' },
      {
        text: c.deleteReview,
        style: 'destructive',
        onPress: () =>
          void actions.remove
            .mutateAsync()
            .catch((error: unknown) =>
              Alert.alert(
                c.deleteReviewError,
                error instanceof ApiClientError ? error.message : c.retryGeneric,
              ),
            ),
      },
    ]);
  return (
    <View style={styles.reviewCard}>
      <Text style={styles.section}>{request.review ? c.editReview : c.review}</Text>
      <View style={styles.stars} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            onPress={() => setRating(value)}
            hitSlop={5}
            accessibilityRole="radio"
            accessibilityLabel={`${c.review}: ${value}/5`}
            accessibilityState={{ checked: value === rating }}
            style={styles.starButton}
          >
            <Ionicons name={value <= rating ? 'star' : 'star-outline'} size={32} color={Colors.accentDark} />
          </Pressable>
        ))}
      </View>
      <AppInput
        value={comment}
        onChangeText={setComment}
        maxLength={1000}
        multiline
        placeholder={c.reviewPlaceholder}
      />
      <AppButton title={c.saveReview} onPress={() => void save()} loading={actions.save.isPending} />
      {request.review ? <AppButton title={c.deleteReview} variant="ghost" onPress={remove} /> : null}
    </View>
  );
}
