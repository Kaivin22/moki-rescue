import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rescueApi } from '../api/rescueApi';
import { rescueKeys } from './useRescueQueries';
import type { ProfileRole } from '@/src/types/profile';
import type { IncidentReport, RescueStatus } from '@/src/types/rescue';

type SupportReason = Parameters<typeof rescueApi.requestSupport>[1];

export function useDispatchRetry(
  requestId: string,
  role: ProfileRole,
  status: RescueStatus | undefined,
  refetch: () => Promise<unknown>,
) {
  return useMutation({
    mutationFn: async () => {
      if (role === 'customer') await rescueApi.retryCustomer(requestId);
      else if (status === 'needs_dispatch') await rescueApi.reassignDispatch(requestId);
      else await rescueApi.retryDispatch(requestId);
      await refetch();
    },
  });
}

export function useSupportAction(requestId: string) {
  return useMutation({
    mutationFn: (reasonCode: SupportReason) => rescueApi.requestSupport(requestId, reasonCode),
  });
}

export function useIncidentActions(requestId: string) {
  const client = useQueryClient();
  const report = useMutation({
    mutationFn: ({ category, description }: { category: IncidentReport['category']; description: string }) =>
      rescueApi.reportIncident(requestId, category, description),
    onSuccess: () => client.invalidateQueries({ queryKey: rescueKeys.request(requestId) }),
  });
  const resolve = useMutation({
    mutationFn: ({
      incidentId,
      decision,
      note,
    }: {
      incidentId: string;
      decision: 'resolved' | 'dismissed';
      note: string;
    }) => rescueApi.resolveIncident(incidentId, decision, note),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: rescueKeys.request(requestId) }),
        client.invalidateQueries({ queryKey: rescueKeys.attention(true) }),
      ]),
  });
  return { report, resolve };
}

export function useReviewActions(requestId: string) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: rescueKeys.request(requestId) });
  const save = useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment?: string }) =>
      rescueApi.saveReview(requestId, rating, comment),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => rescueApi.deleteReview(requestId),
    onSuccess: refresh,
  });
  return { save, remove };
}
