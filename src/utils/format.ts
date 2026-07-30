export function categoryLabel(category?: string | null): string {
  switch (category) {
    case 'beach':
      return 'Bãi biển';
    case 'mountain':
      return 'Núi';
    case 'food':
      return 'Ẩm thực';
    case 'temple':
      return 'Tâm linh';
    case 'museum':
      return 'Bảo tàng';
    case 'market':
      return 'Chợ';
    case 'entertainment':
      return 'Giải trí';
    case 'nature':
      return 'Thiên nhiên';
    case 'historical':
      return 'Di tích';
    case 'viewpoint':
      return 'Ngắm cảnh';
    case 'park':
      return 'Công viên';
    default:
      return category || 'Địa điểm';
  }
}

export function formatCurrency(amount?: number | null): string {
  if (amount == null) return '—';
  return `${amount.toLocaleString('vi-VN')}đ`;
}

export function isPlaceOpenNow(opening?: string | null, closing?: string | null, days?: number[] | null): boolean {
  if (!opening || !closing) return true;
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay();
  if (days && days.length > 0 && !days.includes(day)) return false;

  const [oh, om] = opening.split(':').map(Number);
  const [ch, cm] = closing.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const openMins = oh * 60 + (om || 0);
  const closeMins = ch * 60 + (cm || 0);
  return mins >= openMins && mins <= closeMins;
}
