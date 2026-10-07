import { pieDocument, statusSlices } from '../src/features/operator/statisticsCharts';
import type { OperatorStatistics } from '../src/types/rescue';

const data: OperatorStatistics = {
  timezone: 'Asia/Ho_Chi_Minh',
  fromDate: '2026-09-21',
  toDate: '2026-09-27',
  summary: { openCases: 3, waitingCases: 2, verifiedTeams: 13, openAlerts: 0 },
  daily: [],
  statuses: [
    { status: 'searching', count: 1 },
    { status: 'no_provider', count: 1 },
    { status: 'en_route', count: 1 },
    { status: 'completed', count: 2 },
    { status: 'cancelled', count: 1 },
  ],
};
it('groups every case exactly once, without mixing team or alert totals into the pie', () => {
  expect(statusSlices(data, false).map((s) => s.count)).toEqual([2, 1, 2, 1]);
  expect(statusSlices(data, true).reduce((n, s) => n + s.count, 0)).toBe(6);
});
it('shows an empty outline rather than invented percentages for zero requests', () => {
  const html = pieDocument(statusSlices({ ...data, statuses: [] }, false));
  expect(html).toContain('fill="none"');
  expect(html).not.toContain('<path');
  expect(html).not.toMatch(/NaN|Infinity/);
});
it('renders a full circle for one nonzero category', () => {
  const html = pieDocument([{ count: 2, color: '#28744B' }]);
  expect(html).toContain('<circle');
  expect(html).not.toContain('<path');
});
it('renders proportional sectors without scripts or external requests', () => {
  const html = pieDocument(statusSlices(data, false));
  expect(html.match(/<path /g)).toHaveLength(4);
  expect(html).not.toMatch(/<script|src=|NaN|Infinity/);
});
