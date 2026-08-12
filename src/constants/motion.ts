// Design Tokens — Motion
// Ngôn ngữ chuyển động dùng chung cho toàn app.
// Dùng với Animated API (built-in) — không cần thư viện native.

import { Easing } from 'react-native';

/** Thời lượng animation (ms) — dùng cho timing. */
export const Duration = {
  instant: 120, // ripple, tap highlight
  fast: 180, // press scale, icon toggle
  base: 260, // card enter, fade
  slow: 380, // sheet, expand/collapse
  page: 320, // screen transition
} as const;

/**
 * Cấu hình spring cho Animated.spring.
 * Dùng cho tương tác trực tiếp (nhấn, kéo, like).
 */
export const Spring = {
  // Nhấn nút — cứng, phản hồi nhanh, không nảy
  press: { damping: 18, stiffness: 320, mass: 0.7 },
  // Phần tử xuất hiện — mềm, nảy nhẹ tạo sức sống
  gentle: { damping: 15, stiffness: 180, mass: 0.9 },
  // Like/save — nảy rõ tạo delight
  bouncy: { damping: 10, stiffness: 220, mass: 0.8 },
} as const;

/** Đường cong easing cho timing (chuyển tiếp không gian). */
export const Easings = {
  // Vào nhanh, ra chậm — chuẩn cho phần tử xuất hiện
  standard: Easing.bezier(0.2, 0, 0, 1),
  // Giảm tốc — dùng khi phần tử đi vào màn hình
  decelerate: Easing.out(Easing.cubic),
  // Tăng tốc — dùng khi phần tử rời màn hình
  accelerate: Easing.in(Easing.cubic),
} as const;

/** Giá trị scale chuẩn cho press feedback. */
export const Scale = {
  press: 0.96, // nút chính lún nhẹ
  pressCard: 0.98, // thẻ lớn lún ít hơn
  pop: 1.15, // đỉnh của like bounce
} as const;
