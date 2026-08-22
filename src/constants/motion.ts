// Motion tối thiểu dùng cho phản hồi nhấn. Không có animation trang trí chạy lặp.
export const Spring = {
  press: { damping: 18, stiffness: 320, mass: 0.7 },
} as const;

export const Scale = {
  press: 0.96,
} as const;
