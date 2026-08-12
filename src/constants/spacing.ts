// Design Tokens — Spacing, Radius, Motion, Typography

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  full: 9999,
} as const;

export const Motion = {
  fast: 180,
  normal: 320,
  slow: 520,
  pan: 28000,
  ambient: 6000,
  // ─── Scene atmosphere (SceneCanvas) ─────────────────────────────────────
  kenBurns: 18000, // zoom/drift ảnh nền
  mistDrift: 22000, // sương núi trôi ngang
  waveRoll: 4200, // 1 nhịp sóng biển
  lanternBob: 3600, // đèn lồng đung đưa
  twinkle: 2400, // đèn thành phố / sao nhấp nháy
  glint: 9000, // nắng lướt mặt biển
  clock: 12000, // chu kỳ đồng hồ dùng chung của hệ hạt
  parallaxMax: 40, // px dịch tối đa khi cuộn
} as const;

export const Fonts = {
  display: 'Literata_700Bold',
  displayMedium: 'Literata_500Medium',
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodySemi: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
} as const;

export const Typography = {
  display: {
    fontFamily: Fonts.display,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.4,
  },
  h1: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: Fonts.bodyBold,
    fontSize: 22,
    lineHeight: 28,
  },
  h3: {
    fontFamily: Fonts.bodySemi,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: Fonts.bodySemi,
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
} as const;
