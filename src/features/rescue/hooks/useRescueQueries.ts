import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rescueApi } from '../api/rescueApi';
import { RescueTiming } from '../config/operational';
import type { CreateRescueInput } from '@/src/types/rescue';

export const rescueKeys = {
  all: ['rescue'] as const,
  services: ['rescue', 'services'] as const,
  requests: (history: boolean) => ['rescue', 'requests', history] as const,
  request: (id: string) => ['rescue', 'request', id] as const,
  route: (id: string) => ['rescue', 'route', id] as const,
  providerStatus: ['rescue', 'provider-status'] as const,
  offers: ['rescue', 'offers'] as const,
  teams: ['rescue', 'teams'] as const,
  teamVerification: (teamId: string) => ['rescue', 'team-verification', teamId] as const,
  qualityReviews: (teamId: string) => ['rescue', 'quality-reviews', teamId] as const,
  adminServices: ['rescue', 'admin-services'] as const,
};

export function useServiceTypes() {
  return useQuery({
    queryKey: rescueKeys.services,
    queryFn: rescueApi.serviceTypes,
    staleTime: RescueTiming.serviceCatalogStaleMs,
  });
}

export function useRequests(history = false) {
  return useQuery({
    queryKey: rescueKeys.requests(history),
    queryFn: () => rescueApi.requests(history),
    refetchInterval: history ? false : RescueTiming.activeRequestRefetchMs,
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: rescueKeys.request(id),
    queryFn: () => rescueApi.request(id),
    enabled: Boolean(id),
    refetchInterval: RescueTiming.requestDetailsRefetchMs,
  });
}

export function useRoadRoute(id: string, enabled: boolean) {
  return useQuery({
    queryKey: rescueKeys.route(id),
    queryFn: () => rescueApi.roadRoute(id),
    enabled,
    refetchInterval: enabled ? RescueTiming.roadRouteRefetchMs : false,
    retry: false,
  });
}

export function useCreateRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: { input: CreateRescueInput; idempotencyKey: string }) =>
      rescueApi.create(input, idempotencyKey),
    onSuccess: (request) => {
      client.setQueryData(rescueKeys.request(request.id), request);
      void client.invalidateQueries({ queryKey: rescueKeys.requests(false) });
    },
  });
}

export function useRequestMutation(id: string) {
  const client = useQueryClient();
  const update = (request: unknown) => {
    client.setQueryData(rescueKeys.request(id), request);
    void client.invalidateQueries({ queryKey: rescueKeys.requests(false) });
    void client.invalidateQueries({ queryKey: rescueKeys.requests(true) });
  };
  return {
    action: useMutation({
      mutationFn: (input: { action: string; version: number; workType?: 'repair' | 'transport' }) =>
        rescueApi.action(id, input.action, input.version, input.workType),
      onSuccess: update,
    }),
    cancel: useMutation({
      mutationFn: (input: { reason: string; version: number }) =>
        rescueApi.cancel(id, input.reason, input.version),
      onSuccess: update,
    }),
    quote: useMutation({
      mutationFn: (input: {
        description: string;
        amountVnd: number;
        workType: 'repair' | 'transport';
        expectedRequestVersion: number;
      }) => rescueApi.submitQuote(id, input),
      onSuccess: update,
    }),
    decideQuote: useMutation({
      mutationFn: (input: { quoteId: string; decision: 'approve' | 'reject'; version: number }) =>
        rescueApi.decideQuote(id, input.quoteId, input.decision, input.version),
      onSuccess: update,
    }),
  };
}
