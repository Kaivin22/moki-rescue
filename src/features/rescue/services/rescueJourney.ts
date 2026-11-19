import type { RescueStatus, StatusEvent } from '@/src/types/rescue';

// This is presentation only. API status and recorded events remain authoritative.
const PHASE: Record<RescueStatus, number> = {
  searching: 0,
  offered: 0,
  assigned: 1,
  en_route: 1,
  awaiting_arrival_confirmation: 1,
  arrived: 2,
  diagnosing: 2,
  awaiting_quote: 2,
  quote_approved: 2,
  repairing: 2,
  transporting: 2,
  awaiting_completion: 2,
  completed: 3,
  cancelled: 0,
  no_provider: 0,
  needs_dispatch: 0,
};
export function journeyProgress(status: RescueStatus) {
  const stopped = status === 'cancelled' || status === 'no_provider';
  const phase = PHASE[status];
  return { phase, stopped, complete: status === 'completed' };
}
export function recentJourneyEvents(events: StatusEvent[], limit = 4) {
  return events
    .filter((e) => Number.isFinite(Date.parse(e.createdAt)))
    .map((event, index) => ({ event, index }))
    .sort((a, b) => Date.parse(a.event.createdAt) - Date.parse(b.event.createdAt) || a.index - b.index)
    .slice(-limit)
    .map((e) => e.event);
}
