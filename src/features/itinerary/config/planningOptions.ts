import type { ItineraryDraft } from '@/src/types/itinerary';

export const TRANSPORT_OPTIONS: readonly {
  value: ItineraryDraft['transport'];
  label: string;
  icon: string;
}[] = [
  { value: 'motorbike', label: 'Xe máy', icon: '🏍️' },
  { value: 'car', label: 'Ô tô', icon: '🚗' },
  { value: 'walk', label: 'Đi bộ', icon: '🚶' },
  { value: 'bicycle', label: 'Xe đạp', icon: '🚲' },
];

export const TRAVEL_STYLE_OPTIONS = [
  { value: 'beach', label: 'Biển', icon: '🏖️' },
  { value: 'mountain', label: 'Thiên nhiên', icon: '🏔️' },
  { value: 'history', label: 'Lịch sử', icon: '🏛️' },
  { value: 'relax', label: 'Thư giãn', icon: '🌴' },
  { value: 'photo', label: 'Sống ảo', icon: '📸' },
  { value: 'adventure', label: 'Phiêu lưu', icon: '🧗' },
  { value: 'food', label: 'Ẩm thực', icon: '🍜' },
  { value: 'culture', label: 'Văn hóa', icon: '🏛️' },
  { value: 'family', label: 'Gia đình', icon: '👨‍👩‍👧' },
  { value: 'entertainment', label: 'Vui chơi', icon: '🎡' },
] as const;
