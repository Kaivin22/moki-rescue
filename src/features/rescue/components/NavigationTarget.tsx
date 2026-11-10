import { Text } from 'react-native';
import { Colors } from '@/src/constants/colors';
import type { RequestDetails } from '@/src/types/rescue';

export function NavigationTarget({ request }: { request: RequestDetails }) {
  const dropoff =
    request.activeWorkType === 'transport' &&
    ['transporting', 'awaiting_completion'].includes(request.status);
  const address = dropoff ? request.destinationAreaLabel : request.pickupAreaLabel;
  return address ? <Text style={{ color: Colors.textSecondary }}>{address}</Text> : null;
}
