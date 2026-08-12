export const CATEGORIES = [
  { id: 'beach', label: 'Bãi biển', icon: 'water-outline' },
  { id: 'mountain', label: 'Núi', icon: 'trail-sign-outline' },
  { id: 'food', label: 'Ẩm thực', icon: 'restaurant-outline' },
  { id: 'temple', label: 'Tâm linh', icon: 'leaf-outline' },
  { id: 'museum', label: 'Bảo tàng', icon: 'library-outline' },
  { id: 'market', label: 'Chợ', icon: 'basket-outline' },
  { id: 'entertainment', label: 'Giải trí', icon: 'game-controller-outline' },
  { id: 'nature', label: 'Thiên nhiên', icon: 'flower-outline' },
  { id: 'historical', label: 'Di tích', icon: 'time-outline' },
  { id: 'viewpoint', label: 'Ngắm cảnh', icon: 'camera-outline' },
  { id: 'park', label: 'Công viên', icon: 'walk-outline' },
  { id: 'shopping', label: 'Mua sắm', icon: 'bag-handle-outline' },
  { id: 'wellness', label: 'Chăm sóc sức khỏe', icon: 'fitness-outline' },
];

export const SUITABLE_FOR = [
  { id: 'family', label: 'Gia đình' },
  { id: 'couple', label: 'Cặp đôi' },
  { id: 'solo', label: 'Đi một mình' },
  { id: 'friends', label: 'Nhóm bạn' },
  { id: 'elderly', label: 'Người cao tuổi' },
  { id: 'pet', label: 'Cùng thú cưng' },
];

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
    case 'shopping':
      return 'Mua sắm';
    case 'wellness':
      return 'Chăm sóc sức khỏe';
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
