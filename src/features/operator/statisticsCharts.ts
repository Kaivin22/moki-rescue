import { Colors } from '@/src/constants/colors';
import type { OperatorStatistics } from '@/src/types/rescue';

export function statusSlices(statistics: OperatorStatistics, english: boolean) {
  const groups = [
    {
      key: 'waiting',
      label: english ? 'Waiting / dispatch' : 'Chờ tiếp nhận / điều phối',
      color: Colors.warning,
      count: 0,
    },
    { key: 'handling', label: english ? 'In progress' : 'Đang xử lý', color: Colors.primary, count: 0 },
    { key: 'completed', label: english ? 'Completed' : 'Hoàn thành', color: Colors.success, count: 0 },
    { key: 'cancelled', label: english ? 'Cancelled' : 'Đã hủy', color: Colors.error, count: 0 },
  ];
  for (const item of statistics.statuses) {
    const index =
      item.status === 'completed'
        ? 2
        : item.status === 'cancelled'
          ? 3
          : ['searching', 'offered', 'no_provider', 'needs_dispatch'].includes(item.status)
            ? 0
            : 1;
    groups[index].count += item.count;
  }
  return groups;
}

export function pieDocument(slices: { count: number; color: string }[]) {
  const total = slices.reduce((sum, item) => sum + item.count, 0);
  let angle = -Math.PI / 2;
  const shapes = slices
    .filter((s) => s.count > 0)
    .map((s) => {
      if (s.count === total) return `<circle cx="100" cy="100" r="88" fill="${s.color}"/>`;
      const start = angle;
      angle += (s.count / total) * Math.PI * 2;
      const x1 = 100 + 88 * Math.cos(start),
        y1 = 100 + 88 * Math.sin(start);
      const x2 = 100 + 88 * Math.cos(angle),
        y2 = 100 + 88 * Math.sin(angle);
      return `<path d="M100 100 L${x1} ${y1} A88 88 0 ${s.count / total > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z" fill="${s.color}" stroke="${Colors.cardBg}" stroke-width="2"/>`;
    });
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>html,body{margin:0;background:${Colors.cardBg};height:100%;display:flex;align-items:center;justify-content:center}svg{height:200px;width:200px}</style></head><body><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${total ? shapes.join('') : `<circle cx="100" cy="100" r="88" fill="none" stroke="${Colors.border}" stroke-width="2"/>`}</svg></body></html>`;
}
