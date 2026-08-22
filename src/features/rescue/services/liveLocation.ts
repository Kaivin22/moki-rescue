import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/src/services/supabase';
import type { LocationPoint } from '@/src/types/rescue';
import { RescueTiming } from '@/src/features/rescue/config/operational';
import { isValidProviderLocation } from './locationAccuracy';

const EVENT = 'provider_location';

async function authorizeRealtime() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('AUTH_REQUIRED');
  await supabase.realtime.setAuth(data.session.access_token);
}

export function subscribeToProviderLocation(
  requestId: string,
  onLocation: (location: LocationPoint) => void,
) {
  let channel: RealtimeChannel | null = null;
  let disposed = false;
  void authorizeRealtime()
    .then(() => {
      if (disposed) return;
      channel = supabase
        .channel(`request:${requestId}`, { config: { private: true } })
        .on('broadcast', { event: EVENT }, ({ payload }) => {
          if (isValidProviderLocation(payload)) onLocation(payload);
        })
        .subscribe();
    })
    .catch(() => undefined);
  return () => {
    disposed = true;
    if (channel) void supabase.removeChannel(channel);
  };
}

export async function broadcastProviderLocation(requestId: string, location: LocationPoint) {
  await authorizeRealtime();
  const channel = supabase.channel(`request:${requestId}`, { config: { private: true } });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('REALTIME_TIMEOUT')), RescueTiming.realtimeSendTimeoutMs);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        const result = await channel.send({ type: 'broadcast', event: EVENT, payload: location });
        if (result === 'ok') resolve();
        else reject(new Error('REALTIME_SEND_FAILED'));
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(timer);
        reject(new Error(status));
      }
    });
  }).finally(() => {
    void supabase.removeChannel(channel);
  });
}
